package com.zipsa.lite.ws;

import com.zipsa.lite.store.Models.LogEntry;
import com.zipsa.lite.store.Models.Robot;
import com.zipsa.lite.store.Models.User;
import com.zipsa.lite.store.Store;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Predicate;

/**
 * WebSocket /ws?token= : 토큰으로 인증하고, 역할·가정별로 걸러서 상태를 푸시한다.
 * 연결 직후와 변경마다 snapshot, 그 외 members(가정 변경), log(해당 가정 또는 어드민).
 */
@Component
public class LiveHub extends TextWebSocketHandler implements Store.Listener {

    private static final Logger log = LoggerFactory.getLogger(LiveHub.class);

    private final ObjectProvider<Store> storeProvider;
    private final JsonMapper json;
    private final Map<String, Client> clients = new ConcurrentHashMap<>();

    private record Client(WebSocketSession session, User user) {}

    public LiveHub(ObjectProvider<Store> storeProvider, JsonMapper json) {
        this.storeProvider = storeProvider;
        this.json = json;
    }

    private Store store() { return storeProvider.getObject(); }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws IOException {
        String token = session.getUri() == null ? null
                : UriComponentsBuilder.fromUri(session.getUri()).build().getQueryParams().getFirst("token");
        if (token != null) token = java.net.URLDecoder.decode(token, java.nio.charset.StandardCharsets.UTF_8);
        User user = store().userByToken(token);
        if (user == null) {
            session.close(new CloseStatus(4001, "unauthorized"));
            return;
        }
        Client c = new Client(new ConcurrentWebSocketSessionDecorator(session, 10_000, 1024 * 1024), user);
        clients.put(session.getId(), c);
        send(c, "snapshot", payloadFor(user));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        clients.remove(session.getId());
    }

    /** 사용자에게는 자기 가정·허용 로봇만, 어드민에게는 전체 */
    private Map<String, Object> payloadFor(User user) {
        Store store = store();
        synchronized (store) {
            Map<String, Object> p = new LinkedHashMap<>();
            if (user.role.equals("admin")) {
                p.put("robots", store.allRobotViews());
                p.put("issues", store.allIssueViews());
                p.put("services", store.allServices());
            } else {
                p.put("home", store.homeSummary(user.homeId));
                p.put("robots", store.robotViewsOf(user));
                p.put("tasks", store.tasksOfHome(user.homeId, 30));
                p.put("services", store.publishedServices());
            }
            return p;
        }
    }

    private void send(Client c, String type, Object data) {
        if (!c.session().isOpen()) return;
        try {
            Map<String, Object> msg = new LinkedHashMap<>();
            msg.put("type", type);
            msg.put("data", data);
            c.session().sendMessage(new TextMessage(json.writeValueAsString(msg)));
        } catch (IOException | IllegalStateException e) {
            log.debug("WebSocket 전송 실패: {}", e.getMessage());
        }
    }

    private void push(Predicate<User> filter) {
        for (Client c : clients.values()) {
            if (filter == null || filter.test(c.user())) send(c, "snapshot", payloadFor(c.user()));
        }
    }

    /** 저장소 변경 알림을 받아 해당하는 클라이언트에 보낸다 */
    @Override
    public void on(String event, Object arg) {
        if (clients.isEmpty()) return;
        switch (event) {
            case "robots", "services" -> push(null);
            case "issues" -> push(u -> u.role.equals("admin"));
            case "tasks", "map" -> push(u -> arg.equals(u.homeId));
            case "members" -> {
                for (Client c : clients.values()) {
                    if (arg.equals(c.user().homeId)) send(c, "members", store().membersOf((String) arg));
                }
            }
            case "log" -> {
                LogEntry e = (LogEntry) arg;
                Robot r = store().robot(e.serial());
                for (Client c : clients.values()) {
                    User u = c.user();
                    if (u.role.equals("admin") || (r != null && java.util.Objects.equals(r.homeId, u.homeId))) send(c, "log", e);
                }
            }
            default -> { }
        }
    }
}
