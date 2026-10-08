package com.zipsa.lite.web;

import com.zipsa.lite.chat.ChatAgent;
import com.zipsa.lite.chat.ChatAgent.Turn;
import com.zipsa.lite.chat.Prompts;
import com.zipsa.lite.chat.Tools;
import com.zipsa.lite.store.Models.User;
import com.zipsa.lite.store.Store;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * 대화 (SSE). 이벤트: tool, card, delta, done, error.
 * 형식은 PoC 와 같이 "event: 이름\ndata: JSON\n\n" 이다.
 */
@RestController
public class ChatController {

    private final Store store;
    private final Auth auth;
    private final ChatAgent agent;
    private final JsonMapper json;

    public ChatController(Store store, Auth auth, ChatAgent agent, JsonMapper json) {
        this.store = store;
        this.auth = auth;
        this.agent = agent;
        this.json = json;
    }

    @PostMapping("/api/chat")
    public ResponseEntity<StreamingResponseBody> chat(@RequestHeader(value = "Authorization", required = false) String authorization,
                                  @RequestBody(required = false) JsonNode body) {
        User user = auth.user(authorization);
        List<Turn> messages = clean(body);
        if (messages.isEmpty() || !messages.getLast().role().equals("user")) throw new ApiException(HttpStatus.BAD_REQUEST, "마지막 메시지는 user");
        return stream(emit -> agent.runUser(Prompts.home(user, store.robotsOf(user)), Tools.userTools(store, user), messages, emit));
    }

    @PostMapping("/api/admin/chat")
    public ResponseEntity<StreamingResponseBody> adminChat(@RequestHeader(value = "Authorization", required = false) String authorization,
                                       @RequestBody(required = false) JsonNode body) {
        auth.admin(authorization);
        List<Turn> messages = clean(body);
        if (messages.isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "messages 필요");
        return stream(emit -> agent.runAdmin(Prompts.OPS, Tools.adminTools(store), messages, emit));
    }

    private ResponseEntity<StreamingResponseBody> stream(Function<ChatAgent.Emitter, Map<String, Object>> run) {
        StreamingResponseBody body = out -> {
            SseWriter w = new SseWriter(out);
            try {
                w.emit("done", run.apply(w));
            } catch (RuntimeException e) {
                w.emit("error", Map.of("message", String.valueOf(e.getMessage())));
            }
        };
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "text/event-stream; charset=utf-8")
                .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-transform")
                .header("X-Accel-Buffering", "no")
                .body(body);
    }

    /** 이벤트를 바로 흘려보낸다. 클라이언트가 끊겨도 에이전트는 끝까지 실행된다(PoC 와 같음). */
    private class SseWriter implements ChatAgent.Emitter {
        private final OutputStream out;
        private boolean closed;

        SseWriter(OutputStream out) { this.out = out; }

        @Override
        public synchronized void emit(String event, Object data) {
            if (closed) return;
            try {
                out.write(("event: " + event + "\ndata: " + json.writeValueAsString(data) + "\n\n").getBytes(StandardCharsets.UTF_8));
                out.flush();
            } catch (IOException e) {
                closed = true;
            }
        }
    }

    /** 최근 16개, 각 2000자까지. 첫 user 메시지 앞의 assistant 메시지는 버린다. */
    static List<Turn> clean(JsonNode body) {
        JsonNode arr = body == null ? null : body.get("messages");
        List<Turn> list = new ArrayList<>();
        if (arr == null || !arr.isArray()) return list;
        for (JsonNode m : arr) {
            String role = m.path("role").isString() ? m.get("role").stringValue() : null;
            JsonNode content = m.get("content");
            if (!("user".equals(role) || "assistant".equals(role)) || content == null || !content.isString() || content.stringValue().strip().isEmpty()) continue;
            list.add(new Turn(role, content.stringValue()));
        }
        List<Turn> recent = list.subList(Math.max(0, list.size() - 16), list.size()).stream()
                .map(t -> new Turn(t.role(), t.content().length() > 2000 ? t.content().substring(0, 2000) : t.content()))
                .toList();
        int firstUser = -1;
        for (int i = 0; i < recent.size(); i++) if (recent.get(i).role().equals("user")) { firstUser = i; break; }
        return firstUser < 0 ? List.of() : recent.subList(firstUser, recent.size());
    }
}
