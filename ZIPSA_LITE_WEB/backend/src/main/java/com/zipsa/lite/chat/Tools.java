package com.zipsa.lite.chat;

import com.zipsa.lite.store.Catalog;
import com.zipsa.lite.store.Js;
import com.zipsa.lite.store.Models.Home;
import com.zipsa.lite.store.Models.LogEntry;
import com.zipsa.lite.store.Models.Service;
import com.zipsa.lite.store.Models.Task;
import com.zipsa.lite.store.Models.User;
import com.zipsa.lite.store.Store;
import com.zipsa.lite.store.Views.RobotView;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** 사용자·어드민 대화 도구 (PoC tools.js 이전) */
public final class Tools {

    private record Recipe(String name, List<String> needs, int minutes, String service) {}

    private static final List<Recipe> RECIPES = List.of(
            new Recipe("김치찌개", List.of("김치", "돼지고기", "두부", "대파"), 30, "svc_kimchi"),
            new Recipe("계란말이", List.of("계란", "대파"), 12, null),
            new Recipe("두부조림", List.of("두부", "양파"), 15, null),
            new Recipe("닭가슴살 샐러드", List.of("닭가슴살", "브로콜리"), 10, null),
            new Recipe("계란볶음밥", List.of("계란", "현미밥"), 10, null));

    private static boolean has(List<String> fridge, String need) { return fridge.stream().anyMatch(f -> f.contains(need)); }

    /** 냉장고 재료 보유율 순 상위 3개 요리 */
    static List<Map<String, Object>> recommend(List<String> fridge) {
        return RECIPES.stream()
                .map(r -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("name", r.name());
                    m.put("needs", r.needs());
                    m.put("minutes", r.minutes());
                    if (r.service() != null) m.put("service", r.service());
                    m.put("have", r.needs().stream().filter(n -> has(fridge, n)).toList());
                    m.put("missing", r.needs().stream().filter(n -> !has(fridge, n)).toList());
                    return m;
                })
                .sorted(Comparator.comparingDouble((Map<String, Object> m) -> -ratio(m)))
                .limit(3)
                .collect(Collectors.toCollection(ArrayList::new));
    }

    @SuppressWarnings("unchecked")
    private static double ratio(Map<String, Object> m) {
        return (double) ((List<String>) m.get("have")).size() / ((List<String>) m.get("needs")).size();
    }

    private static Map<String, Object> schema(Map<String, Object> properties, String... required) {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("type", "object");
        s.put("properties", properties);
        if (required.length > 0) s.put("required", List.of(required));
        return s;
    }

    private static Map<String, Object> noInput() { return schema(Map.of()); }

    private static Map<String, Object> type(String type) { return Maps.of("type", type); }

    private static String str(JsonNode input, String field) { return Js.str(Js.get(input, field)); }

    public static List<ChatTool> userTools(Store store, User user) {
        String taskList = Catalog.TASK_TYPES.entrySet().stream().map(e -> e.getKey() + "(" + e.getValue().label() + ")").collect(Collectors.joining(", "));
        return List.of(
                new ChatTool("get_robots", "이 사용자가 제어할 수 있는 로봇의 상태(작업, 위치, 배터리, 오류), 진행 중 작업을 돌려준다.", noInput(), in -> {
                    List<RobotView> robots = store.robotViewsOf(user);
                    List<Task> tasks = store.runningTasksOfHome(user.homeId);
                    return new ChatTool.Output(Maps.of("robots", robots, "tasks", tasks), Maps.of("type", "robots", "robots", robots, "tasks", tasks));
                }),
                new ChatTool("run_task", "로봇에게 작업을 시킨다. type: " + taskList + ". serial 을 생략하면 대기 중인 로봇을 고른다.",
                        schema(Maps.of("type", Maps.of("type", "string", "enum", List.copyOf(Catalog.TASK_TYPES.keySet())), "serial", type("string")), "type"), in -> {
                    Map<String, Object> r = store.createTask(user, str(in, "type"), str(in, "serial"));
                    Object card = r.containsKey("ok") ? Maps.of("type", "task", "task", r.get("task"), "robot", r.get("robot")) : null;
                    return new ChatTool.Output(r, card);
                }),
                new ChatTool("stop_task", "진행 중인 작업을 중지한다.", schema(Maps.of("taskId", type("string")), "taskId"),
                        in -> ChatTool.Output.of(store.stopTask(user, str(in, "taskId")))),
                new ChatTool("fridge_inventory", "냉장고에 있는 식자재 목록(로봇이 마지막 정리 때 기록)", noInput(),
                        in -> ChatTool.Output.of(Maps.of("items", store.fridgeOf(user.homeId)))),
                new ChatTool("recommend_recipe", "냉장고 재료로 만들 수 있는 요리를 추천한다. 있는 재료·부족한 재료·설치된 요리 서비스 포함.", noInput(), in -> {
                    List<String> fridge = store.fridgeOf(user.homeId);
                    List<RobotView> mine = store.robotViewsOf(user);
                    List<Map<String, Object>> recs = recommend(fridge);
                    for (Map<String, Object> r : recs) {
                        String serviceId = (String) r.get("service");
                        Service svc = serviceId == null ? null : store.service(serviceId);
                        r.put("serviceInstalled", serviceId == null ? null : svc != null && mine.stream().anyMatch(x -> svc.installed.contains(x.serial())));
                    }
                    return new ChatTool.Output(Maps.of("fridge", fridge, "recommendations", recs), Maps.of("type", "recipes", "fridge", fridge, "recommendations", recs));
                }),
                new ChatTool("get_map", "실내 지도 생성 여부와 로봇 위치", noInput(), in -> {
                    Home h = store.home(user.homeId);
                    List<RobotView> mine = store.robotViewsOf(user);
                    List<Map<String, Object>> where = mine.stream().map(r -> Maps.of("nickname", r.nickname(), "zone", r.zone())).toList();
                    return new ChatTool.Output(Maps.of("mapReady", h.mapReady, "robots", where), Maps.of("type", "map", "robots", mine, "mapReady", h.mapReady));
                }),
                new ChatTool("report_issue", "로봇 문제를 고객센터에 접수한다(사용자 ID·연락처가 자동 첨부).",
                        schema(Maps.of("serial", type("string"), "title", type("string"), "severity", Maps.of("type", "string", "enum", List.of("low", "medium", "high"))), "serial", "title"), in -> {
                    Map<String, Object> r = store.createIssue(user, str(in, "serial"), str(in, "title"), str(in, "severity"));
                    return new ChatTool.Output(r, Maps.of("type", "issue", "issue", r.get("issue")));
                }),
                new ChatTool("list_services", "설치 가능한 서비스(요리 레시피, 스킬) 목록과 설치 상태", noInput(), in -> {
                    List<RobotView> mine = store.robotViewsOf(user);
                    List<Map<String, Object>> list = store.publishedServices().stream()
                            .map(s -> Maps.of("id", s.id, "name", s.name, "version", s.version,
                                    "installedOn", s.installed.stream().filter(x -> mine.stream().anyMatch(r -> r.serial().equals(x))).toList()))
                            .toList();
                    return ChatTool.Output.of(list);
                }));
    }

    public static List<ChatTool> adminTools(Store store) {
        return List.of(
                new ChatTool("fleet_summary", "전체 로봇 수, 상태별 수, 계약 만료 임박(30일 이내), 미처리 이슈", noInput(), in -> {
                    List<RobotView> rs = store.allRobotViews();
                    Map<String, Integer> byStatus = new LinkedHashMap<>();
                    for (RobotView r : rs) byStatus.merge(r.status(), 1, Integer::sum);
                    List<Map<String, Object>> expiring = rs.stream().filter(r -> r.daysLeft() != null && r.daysLeft() <= 30)
                            .map(r -> Maps.of("serial", r.serial(), "daysLeft", r.daysLeft(), "buyer", r.buyerName())).toList();
                    long open = store.openIssueViews().size();
                    return ChatTool.Output.of(Maps.of("total", rs.size(), "byStatus", byStatus, "expiringSoon", expiring, "openIssues", open));
                }),
                new ChatTool("search_user", "사용자 ID·이름·이메일·연락처로 검색", schema(Maps.of("q", type("string")), "q"),
                        in -> ChatTool.Output.of(store.searchUsers(str(in, "q")))),
                new ChatTool("robot_logs", "로봇 시리얼의 최근 로그", schema(Maps.of("serial", type("string"), "limit", type("number")), "serial"), in -> {
                    JsonNode limit = Js.get(in, "limit");
                    int n = limit == null || limit.isNull() ? 15 : (int) Js.numberOrZero(limit);
                    List<LogEntry> logs = store.logsOf(str(in, "serial"), Math.max(0, n));
                    return ChatTool.Output.of(logs);
                }),
                new ChatTool("list_issues", "미처리 이슈 목록", noInput(), in -> ChatTool.Output.of(store.openIssueViews())));
    }

    private Tools() {}
}
