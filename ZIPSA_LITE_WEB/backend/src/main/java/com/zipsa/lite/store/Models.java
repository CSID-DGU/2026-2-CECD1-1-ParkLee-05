package com.zipsa.lite.store;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 메모리 저장소의 데이터 객체. 응답 JSON 이 PoC(store.js)와 같도록 필드 이름을 그대로 둔다.
 * 멤버·초대의 robots 는 PoC 처럼 "*"(전체) 또는 시리얼 목록이다.
 */
public final class Models {

    public static final class User {
        public String id, email, name, phone, role, homeId;
        @JsonIgnore public String pw;

        public User(String id, String email, String pw, String name, String phone, String role, String homeId) {
            this.id = id; this.email = email; this.pw = pw; this.name = name; this.phone = phone; this.role = role; this.homeId = homeId;
        }
    }

    public static final class Member {
        public String userId, role;
        public Object robots;

        public Member(String userId, String role, Object robots) { this.userId = userId; this.role = role; this.robots = robots; }
    }

    public static final class Invite {
        public String code, email, name;
        public Object robots;
        public String createdAt, status;
    }

    public static final class Home {
        public String id, name, ownerId;
        public boolean mapReady;
        public Integer mapping;
        public List<Member> members = new ArrayList<>();
        public List<Invite> invites = new ArrayList<>();

        public Home(String id, String name, String ownerId, boolean mapReady) { this.id = id; this.name = name; this.ownerId = ownerId; this.mapReady = mapReady; }
    }

    public record Contract(String type, String start, String end, String plan) {}

    public record Buyer(String userId, String store) {}

    public static final class Robot {
        public String serial, model, nickname, homeId, firmware, status;
        public int battery;
        public double[] pos;
        public String task;
        public Map<String, Double> joints = new LinkedHashMap<>();
        public Contract contract;
        public Buyer buyer;
        public String shippedAt, registeredAt, lastSeen, errorCode;
    }

    public static final class Task {
        public String id, serial, homeId, type, status;
        public int progress;
        public String createdAt, by;
    }

    public record Note(String at, String by, String text) {}

    public static final class Issue {
        public String id, serial, userId, contact, title, status, severity, createdAt;
        public List<Note> notes = new ArrayList<>();
    }

    public static final class Service {
        public String id, name, kind, version, author, status;
        public int rolloutPct;
        public String size, changelog;
        public List<String> installed = new ArrayList<>();
    }

    public record LogEntry(String id, String serial, String level, String text, String t, String at) {}

    /** "*" 이면 전체 허용 */
    public static boolean isAll(Object robots) { return "*".equals(robots); }

    @SuppressWarnings("unchecked")
    public static boolean allows(Object robots, String serial) {
        return isAll(robots) || (robots instanceof List<?> l && ((List<String>) l).contains(serial));
    }

    private Models() {}
}
