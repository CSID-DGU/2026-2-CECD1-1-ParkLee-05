package com.zipsa.lite.chat;

import com.zipsa.lite.store.Views.IssueView;
import com.zipsa.lite.store.Views.RobotView;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.BiFunction;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * 준비된 답변 (API 키가 없거나 LLM 호출이 실패했을 때). 문장을 정해진 순서로 검사해 같은 도구를 직접 부른다.
 * 순서가 중요하다: "김치찌개 재료 꺼내서 세팅해줘"는 요리 추천이 아니라 재료 세팅 작업이다.
 */
final class Scripted {

    record Reply(List<Object> cards, String text) {}

    private static final Pattern SERIAL = Pattern.compile("ZH1-\\d{4}-\\d{4}", Pattern.CASE_INSENSITIVE);

    private final JsonMapper json;

    Scripted(JsonMapper json) { this.json = json; }

    private static boolean has(String q, String regex) { return Pattern.compile(regex).matcher(q).find(); }

    private ChatTool.Output call(List<ChatTool> tools, String name, Map<String, Object> input) {
        ChatTool t = tools.stream().filter(x -> x.name().equals(name)).findFirst().orElse(null);
        if (t == null) return ChatTool.Output.of(Map.of());
        JsonNode node = json.valueToTree(input);
        return t.run().apply(node);
    }

    private ChatTool.Output call(List<ChatTool> tools, String name) { return call(tools, name, Map.of()); }

    /** 결과를 JSON 트리로 읽는다 (PoC 처럼 result.ok, result.robots 등으로 접근하기 위해) */
    private JsonNode tree(Object result) { return json.valueToTree(result); }

    private static List<Object> cardsOf(ChatTool.Output o) {
        List<Object> cards = new ArrayList<>();
        if (o.card() != null) cards.add(o.card());
        return cards;
    }

    private static String taskKey(String q) {
        if (has(q, "물")) return "water";
        if (has(q, "세탁|빨래")) return "laundry";
        if (has(q, "택배|배송|정리")) return "unpack_grocery";
        if (has(q, "세팅|준비|꺼내")) return "prep_cooking";
        if (has(q, "청소|닦")) return "clean";
        return null;
    }

    private static String joinText(JsonNode arr, java.util.function.Function<JsonNode, String> f, String sep) {
        List<String> parts = new ArrayList<>();
        for (JsonNode n : arr) parts.add(f.apply(n));
        return String.join(sep, parts);
    }

    private static String s(JsonNode n, String field) {
        JsonNode v = n.get(field);
        if (v == null) return "undefined";
        if (v.isNull()) return "null";
        return v.isString() ? v.stringValue() : v.toString();
    }

    private static String taskReplyText(JsonNode r) {
        return r.has("ok") ? r.get("message").stringValue() : r.get("error").stringValue();
    }

    BiFunction<String, List<ChatTool>, Reply> user() { return this::user; }

    BiFunction<String, List<ChatTool>, Reply> admin() { return this::admin; }

    Reply user(String q, List<ChatTool> tools) {
        if (has(q, "세팅|꺼내|준비해")) {
            ChatTool.Output o = call(tools, "run_task", Maps.of("type", "prep_cooking"));
            JsonNode r = tree(o.result());
            return new Reply(cardsOf(o), r.has("ok") ? r.get("message").stringValue().replace("요리 재료 세팅을(를)", "요리 재료 세팅을") : r.get("error").stringValue());
        }
        if (has(q, "냉장고|요리|뭐 먹|메뉴|추천")) {
            ChatTool.Output o = call(tools, "recommend_recipe");
            JsonNode r = tree(o.result());
            JsonNode fridge = r.get("fridge");
            List<String> first4 = new ArrayList<>();
            for (int i = 0; i < Math.min(4, fridge.size()); i++) first4.add(fridge.get(i).stringValue());
            JsonNode top = r.get("recommendations").get(0);
            JsonNode missing = top.get("missing");
            String need = missing.isEmpty() ? "재료가 다 있어요." : joinText(missing, JsonNode::stringValue, ", ") + "만 더 있으면 돼요.";
            return new Reply(cardsOf(o), "냉장고에 " + String.join(", ", first4) + " 등이 있어요. " + top.get("name").stringValue() + " 추천해요. " + need + " 재료를 요리대에 세팅할까요?");
        }
        String k = taskKey(q);
        if (k != null) {
            Matcher m = SERIAL.matcher(q);
            Map<String, Object> input = Maps.of("type", k);
            if (m.find()) input.put("serial", m.group());
            ChatTool.Output o = call(tools, "run_task", input);
            return new Reply(cardsOf(o), taskReplyText(tree(o.result())));
        }
        if (has(q, "지도|맵|어디")) {
            ChatTool.Output o = call(tools, "get_map");
            JsonNode r = tree(o.result());
            String text = r.get("mapReady").booleanValue()
                    ? "지금 " + joinText(r.get("robots"), x -> s(x, "nickname") + "은(는) " + s(x, "zone"), ", ") + "에 있어요."
                    : "아직 실내 지도가 없어요. 로봇 탭에서 맵 생성을 눌러 주세요.";
            return new Reply(cardsOf(o), text);
        }
        if (has(q, "고장|문제|접수|안 움직|오류|에러")) {
            @SuppressWarnings("unchecked")
            List<RobotView> rs = (List<RobotView>) ((Map<String, Object>) call(tools, "get_robots").result()).get("robots");
            RobotView bad = rs.stream().filter(r -> r.status().equals("error")).findFirst().orElse(null);
            if (bad != null) {
                ChatTool.Output o = call(tools, "report_issue", Maps.of("serial", bad.serial(), "title", bad.errorCode() + " · 사용자 신고", "severity", "high"));
                return new Reply(cardsOf(o), bad.nickname() + "에 " + bad.errorCode() + " 오류가 있어요. 고객센터에 접수했습니다. 담당자가 연락처로 연락드릴 거예요.");
            }
            return new Reply(List.of(), "지금 오류 상태인 로봇은 없어요. 증상을 조금 더 알려 주시면 접수해 드릴게요.");
        }
        ChatTool.Output o = call(tools, "get_robots");
        @SuppressWarnings("unchecked")
        List<RobotView> rs = (List<RobotView>) ((Map<String, Object>) o.result()).get("robots");
        String text = rs.isEmpty() ? "아직 연결된 로봇이 없어요. 시리얼 번호로 먼저 연결해 주세요."
                : "로봇 " + rs.size() + "대 중 " + rs.stream().filter(r -> r.status().equals("run")).count() + "대가 일하는 중이에요. "
                + rs.stream().map(r -> r.nickname() + " " + r.battery() + "%").collect(Collectors.joining(", ")) + ".";
        return new Reply(cardsOf(o), text);
    }

    Reply admin(String q, List<ChatTool> tools) {
        if (has(q, "만료|계약")) {
            JsonNode e = tree(call(tools, "fleet_summary").result()).get("expiringSoon");
            String text = !e.isEmpty()
                    ? "30일 안에 계약이 끝나는 로봇은 " + e.size() + "대입니다. " + joinText(e, x -> s(x, "serial") + "(" + s(x, "buyer") + ", " + s(x, "daysLeft") + "일)", ", ") + ". 갱신 안내를 보내세요."
                    : "30일 안에 만료되는 계약은 없습니다.";
            return new Reply(List.of(), text);
        }
        if (has(q, "이슈|접수|문의")) {
            @SuppressWarnings("unchecked")
            List<IssueView> list = (List<IssueView>) call(tools, "list_issues").result();
            return new Reply(List.of(), "미처리 이슈 " + list.size() + "건입니다. "
                    + list.stream().map(i -> i.serial() + " " + i.title() + "(" + i.userName() + ", " + i.contact() + ")").collect(Collectors.joining(" / ")));
        }
        Matcher m = SERIAL.matcher(q);
        if (m.find()) {
            String serial = m.group().toUpperCase(Locale.ROOT);
            JsonNode logs = tree(call(tools, "robot_logs", Maps.of("serial", serial, "limit", 5)).result());
            String joined = joinText(logs, l -> "[" + s(l, "t") + "] " + s(l, "text"), " · ");
            return new Reply(List.of(), serial + " 최근 로그: " + (joined.isEmpty() ? "없음" : joined));
        }
        JsonNode sum = tree(call(tools, "fleet_summary").result());
        List<String> byStatus = new ArrayList<>();
        sum.get("byStatus").properties().forEach(e -> byStatus.add(e.getKey() + " " + e.getValue().asInt()));
        return new Reply(List.of(), "전체 " + sum.get("total").asInt() + "대 · " + String.join(", ", byStatus) + " · 미처리 이슈 "
                + sum.get("openIssues").asInt() + "건 · 만료 임박 " + sum.get("expiringSoon").size() + "대. (준비된 답변)");
    }
}
