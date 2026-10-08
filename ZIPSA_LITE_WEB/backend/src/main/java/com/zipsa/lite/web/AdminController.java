package com.zipsa.lite.web;

import com.zipsa.lite.store.Js;
import com.zipsa.lite.store.Models.LogEntry;
import com.zipsa.lite.store.Models.User;
import com.zipsa.lite.store.Store;
import com.zipsa.lite.store.Store.ServiceFields;
import com.zipsa.lite.store.Views.FoundUser;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.zipsa.lite.web.PublicController.text;

/** 슈퍼어드민 API */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private static final String AUTH = "Authorization";

    private final Store store;
    private final Auth auth;

    public AdminController(Store store, Auth auth) {
        this.store = store;
        this.auth = auth;
    }

    @GetMapping("/overview")
    public Map<String, Object> overview(@RequestHeader(value = AUTH, required = false) String authorization) {
        auth.admin(authorization);
        synchronized (store) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("robots", store.allRobotViews());
            r.put("issues", store.allIssueViews());
            r.put("services", store.allServices());
            r.put("logs", store.recentLogs(100));
            return r;
        }
    }

    @GetMapping("/users")
    public List<FoundUser> users(@RequestHeader(value = AUTH, required = false) String authorization,
                                 @RequestParam(required = false) String q) {
        auth.admin(authorization);
        return store.searchUsers(q);
    }

    @GetMapping("/logs")
    public List<LogEntry> logs(@RequestHeader(value = AUTH, required = false) String authorization,
                               @RequestParam(required = false) String serial, @RequestParam(required = false) String level,
                               @RequestParam(required = false) String q, @RequestParam(required = false) String limit) {
        auth.admin(authorization);
        return store.filterLogs(serial, level, q, Replies.limit(limit, 200));
    }

    @PostMapping("/issues")
    public ResponseEntity<Map<String, Object>> createIssue(@RequestHeader(value = AUTH, required = false) String authorization,
                                                           @RequestBody(required = false) JsonNode body) {
        auth.admin(authorization);
        String userId = text(body, "userId");
        User user = userId == null ? null : store.user(userId);
        if (user == null) throw new ApiException(HttpStatus.BAD_REQUEST, "사용자 없음");
        return Replies.reply(store.createIssue(user, text(body, "serial"), text(body, "title"), text(body, "severity")));
    }

    @PatchMapping("/issues/{id}")
    public ResponseEntity<Map<String, Object>> updateIssue(@RequestHeader(value = AUTH, required = false) String authorization,
                                                           @PathVariable String id, @RequestBody(required = false) JsonNode body) {
        User admin = auth.admin(authorization);
        return Replies.reply(store.updateIssue(admin, id, text(body, "status"), text(body, "note")));
    }

    @PostMapping("/robots/{serial}/remedy")
    public ResponseEntity<Map<String, Object>> remedy(@RequestHeader(value = AUTH, required = false) String authorization,
                                                      @PathVariable String serial, @RequestBody(required = false) JsonNode body) {
        User admin = auth.admin(authorization);
        return Replies.reply(store.remedy(admin, serial, text(body, "action")));
    }

    /** 서비스 등록·수정 (이름·종류·버전·용량·제작자·변경 사항) */
    @PostMapping("/services")
    public ResponseEntity<Map<String, Object>> upsertService(@RequestHeader(value = AUTH, required = false) String authorization,
                                                             @RequestBody(required = false) JsonNode body) {
        User admin = auth.admin(authorization);
        JsonNode pct = Js.get(body, "rolloutPct");
        JsonNode installed = Js.get(body, "installed");
        List<String> installedList = null;
        if (installed != null && installed.isArray()) {
            installedList = new ArrayList<>();
            for (JsonNode x : installed) installedList.add(Js.str(x));
        }
        ServiceFields fields = new ServiceFields(text(body, "id"), text(body, "name"), text(body, "kind"), text(body, "version"),
                text(body, "author"), text(body, "status"), pct == null || pct.isNull() ? null : (int) Js.numberOrZero(pct),
                text(body, "size"), text(body, "changelog"), installedList);
        return Replies.reply(store.upsertService(admin, fields));
    }

    @PostMapping("/services/{id}/publish")
    public ResponseEntity<Map<String, Object>> publish(@RequestHeader(value = AUTH, required = false) String authorization,
                                                       @PathVariable String id, @RequestBody(required = false) JsonNode body) {
        User admin = auth.admin(authorization);
        return Replies.reply(store.publishService(admin, id, (int) Js.numberOrZero(Js.get(body, "rolloutPct"))));
    }

    @PostMapping("/reset")
    public Map<String, Object> reset(@RequestHeader(value = AUTH, required = false) String authorization) {
        auth.admin(authorization);
        store.reset();
        return Map.of("ok", true);
    }
}
