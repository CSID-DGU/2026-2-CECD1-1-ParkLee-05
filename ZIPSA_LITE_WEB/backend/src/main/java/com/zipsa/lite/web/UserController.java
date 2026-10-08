package com.zipsa.lite.web;

import com.zipsa.lite.store.Js;
import com.zipsa.lite.store.Models.LogEntry;
import com.zipsa.lite.store.Models.Robot;
import com.zipsa.lite.store.Models.User;
import com.zipsa.lite.store.Store;
import com.zipsa.lite.store.Views.Members;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
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

/** 사용자 앱 API (가정 관리자·멤버) */
@RestController
@RequestMapping("/api")
public class UserController {

    private static final String AUTH = "Authorization";

    private final Store store;
    private final Auth auth;

    public UserController(Store store, Auth auth) {
        this.store = store;
        this.auth = auth;
    }

    @GetMapping("/home")
    public Map<String, Object> home(@RequestHeader(value = AUTH, required = false) String authorization) {
        User u = auth.user(authorization);
        synchronized (store) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("home", store.homeSummary(u.homeId));
            r.put("robots", store.robotViewsOf(u));
            r.put("tasks", store.tasksOfHome(u.homeId, 30));
            r.put("fridge", store.fridgeOf(u.homeId));
            r.put("services", store.publishedServices());
            return r;
        }
    }

    @PostMapping("/home/register")
    public ResponseEntity<Map<String, Object>> register(@RequestHeader(value = AUTH, required = false) String authorization,
                                                        @RequestBody(required = false) JsonNode body) {
        return Replies.reply(store.register(auth.user(authorization), text(body, "serial"), text(body, "nickname")));
    }

    @GetMapping("/home/members")
    public Members members(@RequestHeader(value = AUTH, required = false) String authorization) {
        return store.membersOf(auth.user(authorization).homeId);
    }

    @PostMapping("/home/members/invite")
    public ResponseEntity<Map<String, Object>> invite(@RequestHeader(value = AUTH, required = false) String authorization,
                                                      @RequestBody(required = false) JsonNode body) {
        return Replies.reply(store.invite(auth.user(authorization), text(body, "email"), text(body, "name"), robots(Js.get(body, "robots"))));
    }

    @PatchMapping("/home/members/{id}")
    public ResponseEntity<Map<String, Object>> setMemberRobots(@RequestHeader(value = AUTH, required = false) String authorization,
                                                               @PathVariable String id, @RequestBody(required = false) JsonNode body) {
        return Replies.reply(store.setMemberRobots(auth.user(authorization), id, robots(Js.get(body, "robots"))));
    }

    @DeleteMapping("/home/members/{id}")
    public ResponseEntity<Map<String, Object>> removeMember(@RequestHeader(value = AUTH, required = false) String authorization,
                                                            @PathVariable String id) {
        return Replies.reply(store.removeMember(auth.user(authorization), id));
    }

    @PostMapping("/tasks")
    public ResponseEntity<Map<String, Object>> createTask(@RequestHeader(value = AUTH, required = false) String authorization,
                                                          @RequestBody(required = false) JsonNode body) {
        return Replies.reply(store.createTask(auth.user(authorization), text(body, "type"), text(body, "serial")));
    }

    @PostMapping("/tasks/{id}/stop")
    public ResponseEntity<Map<String, Object>> stopTask(@RequestHeader(value = AUTH, required = false) String authorization,
                                                        @PathVariable String id) {
        return Replies.reply(store.stopTask(auth.user(authorization), id));
    }

    /** { joint, angle } | { move } | { home: true } */
    @PostMapping("/robots/{serial}/control")
    public ResponseEntity<Map<String, Object>> control(@RequestHeader(value = AUTH, required = false) String authorization,
                                                       @PathVariable String serial, @RequestBody(required = false) JsonNode body) {
        User u = auth.user(authorization);
        String joint = Js.truthy(Js.get(body, "joint")) ? text(body, "joint") : null;
        String move = Js.truthy(Js.get(body, "move")) ? text(body, "move") : null;
        return Replies.reply(store.control(u, serial, joint, Js.numberOrZero(Js.get(body, "angle")), move, Js.truthy(Js.get(body, "home"))));
    }

    @PostMapping("/home/map/scan")
    public ResponseEntity<Map<String, Object>> scan(@RequestHeader(value = AUTH, required = false) String authorization) {
        return Replies.reply(store.startMapping(auth.user(authorization)));
    }

    @PostMapping("/issues")
    public ResponseEntity<Map<String, Object>> createIssue(@RequestHeader(value = AUTH, required = false) String authorization,
                                                           @RequestBody(required = false) JsonNode body) {
        return Replies.reply(store.createIssue(auth.user(authorization), text(body, "serial"), text(body, "title"), text(body, "severity")));
    }

    @PostMapping("/services/{id}/install")
    public ResponseEntity<Map<String, Object>> install(@RequestHeader(value = AUTH, required = false) String authorization,
                                                       @PathVariable String id, @RequestBody(required = false) JsonNode body) {
        return Replies.reply(store.installService(auth.user(authorization), id, text(body, "serial")));
    }

    /** 로봇 로그. 어드민은 전체, 사용자는 자기 가정 로봇만 */
    @GetMapping("/robots/{serial}/logs")
    public List<LogEntry> logs(@RequestHeader(value = AUTH, required = false) String authorization,
                               @PathVariable String serial, @RequestParam(required = false) String limit) {
        User u = auth.any(authorization);
        Robot r = store.robot(serial);
        if (r == null || (!u.role.equals("admin") && (r.homeId == null || !r.homeId.equals(u.homeId)))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "권한 없음");
        }
        return store.logsOf(r.serial, Replies.limit(limit, 50));
    }

    /** "*"(전체) 또는 시리얼 목록 */
    static Object robots(JsonNode n) {
        if (n == null || n.isNull() || n.isMissingNode()) return null;
        if (n.isString()) return n.stringValue();
        if (n.isArray()) {
            List<String> list = new ArrayList<>();
            n.forEach(x -> list.add(Js.str(x)));
            return list;
        }
        return null;
    }
}
