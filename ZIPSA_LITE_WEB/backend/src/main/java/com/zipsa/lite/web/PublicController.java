package com.zipsa.lite.web;

import com.zipsa.lite.chat.ChatAgent;
import com.zipsa.lite.store.Catalog;
import com.zipsa.lite.store.Js;
import com.zipsa.lite.store.Store;
import com.zipsa.lite.store.Views.PublicUser;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/** 인증 없이 부르는 API (상태, 메타, 로그인·가입·초대 합류) */
@RestController
@RequestMapping("/api")
public class PublicController {

    private final Store store;
    private final Auth auth;
    private final ChatAgent agent;

    public PublicController(Store store, Auth auth, ChatAgent agent) {
        this.store = store;
        this.auth = auth;
        this.agent = agent;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("ok", true);
        r.put("llm", agent.enabled());
        r.put("model", agent.enabled() ? agent.model() : null);
        r.put("robotModel", Catalog.ROBOT_MODEL);
        return r;
    }

    @GetMapping("/meta")
    public Map<String, Object> meta() {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("taskTypes", Catalog.TASK_TYPES);
        r.put("joints", Catalog.JOINTS);
        r.put("rooms", Catalog.ROOMS);
        r.put("robotModel", Catalog.ROBOT_MODEL);
        return r;
    }

    @PostMapping("/auth/login")
    public Map<String, Object> login(@RequestBody(required = false) JsonNode body) {
        Map<String, Object> r = store.login(text(body, "email"), text(body, "pw"));
        if (r == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 맞지 않습니다.");
        return r;
    }

    @PostMapping("/auth/signup")
    public ResponseEntity<Map<String, Object>> signup(@RequestBody(required = false) JsonNode body) {
        return Replies.reply(store.signup(text(body, "email"), text(body, "pw"), text(body, "name"), text(body, "phone")));
    }

    @PostMapping("/auth/accept-invite")
    public ResponseEntity<Map<String, Object>> acceptInvite(@RequestBody(required = false) JsonNode body) {
        String code = Js.truthy(Js.get(body, "code")) ? Js.str(Js.get(body, "code")).toUpperCase(Locale.ROOT) : "";
        return Replies.reply(store.acceptInvite(code, text(body, "email"), text(body, "pw"), text(body, "name"), text(body, "phone")));
    }

    @GetMapping("/auth/me")
    public PublicUser me(@RequestHeader(value = "Authorization", required = false) String authorization) {
        return store.publicUser(auth.any(authorization));
    }

    static String text(JsonNode body, String field) { return Js.str(Js.get(body, field)); }
}
