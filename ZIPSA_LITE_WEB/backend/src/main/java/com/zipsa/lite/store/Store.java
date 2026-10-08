package com.zipsa.lite.store;

import com.zipsa.lite.store.Catalog.TaskType;
import com.zipsa.lite.store.Models.Buyer;
import com.zipsa.lite.store.Models.Contract;
import com.zipsa.lite.store.Models.Home;
import com.zipsa.lite.store.Models.Invite;
import com.zipsa.lite.store.Models.Issue;
import com.zipsa.lite.store.Models.LogEntry;
import com.zipsa.lite.store.Models.Member;
import com.zipsa.lite.store.Models.Note;
import com.zipsa.lite.store.Models.Robot;
import com.zipsa.lite.store.Models.Service;
import com.zipsa.lite.store.Models.Task;
import com.zipsa.lite.store.Models.User;
import com.zipsa.lite.store.Views.FoundUser;
import com.zipsa.lite.store.Views.HomeSummary;
import com.zipsa.lite.store.Views.IssueView;
import com.zipsa.lite.store.Views.MemberView;
import com.zipsa.lite.store.Views.Members;
import com.zipsa.lite.store.Views.PublicUser;
import com.zipsa.lite.store.Views.RobotView;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Random;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

import static com.zipsa.lite.store.Catalog.JOINTS;
import static com.zipsa.lite.store.Catalog.ROBOT_MODEL;
import static com.zipsa.lite.store.Catalog.TASK_TYPES;
import static com.zipsa.lite.store.Catalog.roomOf;

/**
 * 메모리 데이터 저장소 — 사용자, 가정, 로봇, 계약, 작업, 이슈, 서비스 카탈로그 (PoC store.js 이전).
 * 시뮬레이션 틱·맵 스캔·요청이 서로 다른 스레드에서 들어오므로 공개 메서드는 모두 synchronized 로 직렬화한다.
 * 실제 서비스에서는 이 클래스의 메서드 시그니처를 유지한 채 DB 로 교체한다.
 */
public class Store {

    /** 상태가 바뀌면 WebSocket 으로 내보내기 위한 알림 (robots, services, issues, tasks, members, map, log, reset) */
    public interface Listener {
        void on(String event, Object arg);
    }

    private final Listener listener;
    private final ScheduledExecutorService scheduler;
    private final Random random = new Random();
    private final SecureRandom secureRandom = new SecureRandom();
    /** 초기화해도 이어지는 일련번호 (PoC 와 같은 id 를 만든다) */
    private long seq = 1000;

    List<User> users;
    List<Home> homes;
    List<Robot> robots;
    Map<String, List<String>> fridge;
    List<Task> tasks;
    List<LogEntry> logs;
    List<Issue> issues;
    List<Service> services;
    Map<String, String> sessions;

    public Store(Listener listener, ScheduledExecutorService scheduler) {
        this.listener = listener;
        this.scheduler = scheduler;
        reset();
    }

    private void emit(String event, Object arg) { listener.on(event, arg); }

    private void emit(String event) { emit(event, null); }

    String nid(String prefix) { return prefix + "_" + Long.toString(seq++, 36); }

    // ----- 초기 데이터 -----
    public synchronized void reset() {
        users = new ArrayList<>(List.of(
                new User("u_owner", "owner@demo.kr", "demo", "김세호", "010-1234-5678", "owner", "h1"),
                new User("u_member", "member@demo.kr", "demo", "이지은", "010-2222-3333", "member", "h1"),
                new User("u_admin", "admin@demo.kr", "demo", "슈퍼어드민", "02-555-0100", "admin", null),
                new User("u_park", "park@demo.kr", "demo", "박민수", "010-9876-5432", "owner", "h2"),
                new User("u_choi", "choi@demo.kr", "demo", "최유리", "010-5555-1212", "owner", "h3")));

        Home h1 = new Home("h1", "세호네 집", "u_owner", true);
        h1.members.add(new Member("u_owner", "owner", "*"));
        h1.members.add(new Member("u_member", "member", new ArrayList<>(List.of("ZH1-2604-0001"))));
        Home h2 = new Home("h2", "민수네 집", "u_park", false);
        h2.members.add(new Member("u_park", "owner", "*"));
        Home h3 = new Home("h3", "유리네 집", "u_choi", true);
        h3.members.add(new Member("u_choi", "owner", "*"));
        homes = new ArrayList<>(List.of(h1, h2, h3));

        // ----- 로봇 (판매점에서 부여한 시리얼) -----
        robots = new ArrayList<>(List.of(
                robot("ZH1-2604-0001", "집사", "h1", "run", 78, new double[] {55, 40}, "clean", null, Times.day(-120),
                        new Contract("purchase", Times.day(-120), Times.day(245), "완제품 구매 · 1년 케어"), new Buyer("u_owner", "강남 플래그십"), null),
                robot("ZH1-2604-0002", "둘째", "h1", "charge", 23, new double[] {200, 185}, null, null, Times.day(-40),
                        new Contract("subscription", Times.day(-40), Times.day(-40 + 365), "월 구독 · 12개월"), new Buyer("u_owner", "강남 플래그십"), null),
                robot("ZH1-2605-0017", "도우미", "h2", "error", 55, new double[] {60, 112}, null, "E-214 좌측 손목 토크 초과", Times.day(-200),
                        new Contract("subscription", Times.day(-200), Times.day(12), "월 구독 · 12개월"), new Buyer("u_park", "온라인몰"), null),
                robot("ZH1-2605-0031", "유리봇", "h3", "idle", 96, null, null, null, Times.day(-15),
                        new Contract("purchase", Times.day(-15), Times.day(350), "완제품 구매 · 1년 케어"), new Buyer("u_choi", "부산 센텀"), null),
                robot("ZH1-2606-0042", null, null, "shipped", 100, null, null, null, null,
                        new Contract("subscription", Times.day(-2), Times.day(363), "월 구독 · 12개월"), new Buyer("u_owner", "강남 플래그십"), Times.day(-2)),
                robot("ZH1-2606-0043", null, null, "shipped", 100, null, null, null, null,
                        new Contract("purchase", Times.day(-1), Times.day(364), "완제품 구매 · 1년 케어"), new Buyer("u_park", "온라인몰"), Times.day(-1))));

        fridge = new HashMap<>();
        fridge.put("h1", new ArrayList<>(List.of("두부", "돼지고기 앞다리살", "김치", "대파", "계란 6개", "양파")));
        fridge.put("h2", new ArrayList<>(List.of("계란 2개", "우유")));
        fridge.put("h3", new ArrayList<>(List.of("닭가슴살", "브로콜리", "현미밥")));

        tasks = new ArrayList<>();
        tasks.add(task("ZH1-2604-0001", "h1", "clean", "running", 40, "u_owner"));
        tasks.add(task("ZH1-2604-0001", "h1", "water", "done", 100, "u_member"));

        logs = new ArrayList<>();
        for (Robot r : robots) {
            if (r.status.equals("shipped")) { log(r.serial, "info", "출하 · 시리얼 발급"); continue; }
            log(r.serial, "info", "부팅 · 펌웨어 " + r.firmware);
            log(r.serial, "info", "배터리 " + r.battery + "%");
            if (r.errorCode != null) { log(r.serial, "error", r.errorCode); log(r.serial, "warn", "안전 정지 · 작업 보류"); }
        }

        issues = new ArrayList<>();
        issues.add(issue("ZH1-2605-0017", "u_park", "010-9876-5432", "왼손이 안 움직이고 멈춰요", "open", "high", List.of()));
        issues.add(issue("ZH1-2604-0002", "u_owner", "010-1234-5678", "충전이 80%에서 멈춥니다", "in_progress", "medium",
                List.of(new Note(Times.nowIso(), "슈퍼어드민", "배터리 캘리브레이션 원격 실행 예약"))));

        services = new ArrayList<>(List.of(
                service("svc_kimchi", "에드워드권의 김치찌개 요리", "recipe", "1.0.0", "에드워드권", "published", 40, "48MB", "돼지고기 김치찌개 조리 동작 · 재료 세팅 포함", List.of("ZH1-2604-0001")),
                service("svc_laundry2", "세탁 2.1 (울 코스 지원)", "skill", "2.1.0", "ZIPSA", "published", 100, "12MB", "울·섬세 코스, 건조기 이동", List.of("ZH1-2604-0001", "ZH1-2604-0002", "ZH1-2605-0031")),
                service("svc_pasta", "이연복의 짜장면", "recipe", "0.9.0", "이연복", "draft", 0, "51MB", "베타 · 웍 동작 검증 중", List.of())));

        sessions = new HashMap<>();
        emit("reset");
    }

    private static Robot robot(String serial, String nickname, String homeId, String status, int battery, double[] pos, String task,
                               String errorCode, String registeredAt, Contract contract, Buyer buyer, String shippedAt) {
        Robot r = new Robot();
        r.serial = serial; r.model = ROBOT_MODEL; r.nickname = nickname; r.homeId = homeId; r.firmware = "2.4.1";
        r.status = status; r.battery = battery; r.pos = pos != null ? pos : new double[] {150, 170}; r.task = task;
        r.joints = zeroJoints(); r.contract = contract; r.buyer = buyer;
        r.shippedAt = shippedAt != null ? shippedAt : Times.day(-30); r.registeredAt = registeredAt; r.lastSeen = Times.nowIso(); r.errorCode = errorCode;
        return r;
    }

    private static Map<String, Double> zeroJoints() {
        Map<String, Double> j = new LinkedHashMap<>();
        for (String name : JOINTS) j.put(name, 0.0);
        return j;
    }

    private Task task(String serial, String homeId, String type, String status, int progress, String by) {
        Task t = new Task();
        t.id = nid("t"); t.serial = serial; t.homeId = homeId; t.type = type; t.status = status; t.progress = progress; t.createdAt = Times.nowIso(); t.by = by;
        return t;
    }

    private Issue issue(String serial, String userId, String contact, String title, String status, String severity, List<Note> notes) {
        Issue i = new Issue();
        i.id = nid("i"); i.serial = serial; i.userId = userId; i.contact = contact; i.title = title; i.status = status; i.severity = severity;
        i.createdAt = Times.nowIso(); i.notes = new ArrayList<>(notes);
        return i;
    }

    private static Service service(String id, String name, String kind, String version, String author, String status, int rolloutPct,
                                   String size, String changelog, List<String> installed) {
        Service s = new Service();
        s.id = id; s.name = name; s.kind = kind; s.version = version; s.author = author; s.status = status; s.rolloutPct = rolloutPct;
        s.size = size; s.changelog = changelog; s.installed = new ArrayList<>(installed);
        return s;
    }

    // ----- 결과 -----
    /** PoC 의 { ok: true, ... } / { error } 응답 */
    public static Map<String, Object> ok(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", true);
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]);
        return m;
    }

    public static Map<String, Object> error(String message) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("error", message);
        return m;
    }

    // ----- 로그 -----
    public synchronized LogEntry log(String serial, String level, String text) {
        LogEntry e = new LogEntry(nid("l"), serial, level, text, Times.hhmmss(), Times.nowIso());
        logs.addFirst(e);
        if (logs.size() > 2000) logs.subList(2000, logs.size()).clear();
        emit("log", e);
        return e;
    }

    public synchronized List<LogEntry> logsOf(String serial, int limit) {
        return logs.stream().filter(l -> Objects.equals(l.serial(), serial)).limit(limit).toList();
    }

    /** 어드민 로그 필터: 시리얼·레벨은 일치, 내용은 부분 일치 */
    public synchronized List<LogEntry> filterLogs(String serial, String level, String q, int limit) {
        return logs.stream()
                .filter(l -> isEmpty(serial) || l.serial().equals(serial))
                .filter(l -> isEmpty(level) || l.level().equals(level))
                .filter(l -> isEmpty(q) || l.text().contains(q))
                .limit(limit).toList();
    }

    public synchronized List<LogEntry> recentLogs(int limit) { return logs.stream().limit(limit).toList(); }

    // ----- 계정 -----
    public synchronized Map<String, Object> login(String email, String pw) {
        User u = users.stream().filter(x -> Objects.equals(x.email, email) && Objects.equals(x.pw, pw)).findFirst().orElse(null);
        if (u == null) return null;
        byte[] bytes = new byte[18];
        secureRandom.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        sessions.put(token, u.id);
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("token", token);
        r.put("user", publicUser(u));
        return r;
    }

    public synchronized User userByToken(String token) {
        String id = token == null ? null : sessions.get(token);
        return id == null ? null : user(id);
    }

    public synchronized User user(String id) { return users.stream().filter(u -> u.id.equals(id)).findFirst().orElse(null); }

    public PublicUser publicUser(User u) { return u == null ? null : new PublicUser(u.id, u.email, u.name, u.phone, u.role, u.homeId); }

    public synchronized Map<String, Object> signup(String email, String pw, String name, String phone) {
        if (users.stream().anyMatch(u -> Objects.equals(u.email, email))) return error("이미 가입된 이메일입니다.");
        Home home = new Home(nid("h"), name + "네 집", null, false);
        User u = new User(nid("u"), email, pw, name, phone, "owner", home.id);
        home.ownerId = u.id;
        home.members.add(new Member(u.id, "owner", "*"));
        users.add(u);
        homes.add(home);
        return login(email, pw);
    }

    // ----- 가정·로봇 -----
    public synchronized Home home(String id) { return homes.stream().filter(h -> h.id.equals(id)).findFirst().orElse(null); }

    public synchronized Robot robot(String serial) {
        String s = String.valueOf(serial).toUpperCase(Locale.ROOT).trim();
        return robots.stream().filter(r -> r.serial.equals(s)).findFirst().orElse(null);
    }

    /** 사용자가 볼 수 있는 로봇. 멤버는 허용된 로봇만 */
    public synchronized List<Robot> robotsOf(User user) {
        Home h = user.homeId == null ? null : home(user.homeId);
        if (h == null) return List.of();
        Member m = h.members.stream().filter(x -> x.userId.equals(user.id)).findFirst().orElse(null);
        return robots.stream().filter(r -> h.id.equals(r.homeId) && (m == null || Models.allows(m.robots, r.serial))).toList();
    }

    public synchronized RobotView robotView(Robot r) {
        Integer daysLeft = r.contract != null ? Times.daysUntil(r.contract.end()) : null;
        User buyer = r.buyer != null ? user(r.buyer.userId()) : null;
        Home home = r.homeId != null ? home(r.homeId) : null;
        return new RobotView(r.serial, r.model, r.nickname, r.homeId, r.firmware, r.status, r.battery, r.pos.clone(), r.task,
                new LinkedHashMap<>(r.joints), r.contract, r.buyer, r.shippedAt, r.registeredAt, r.lastSeen, r.errorCode,
                roomOf(r.pos), daysLeft, buyer != null ? buyer.name : null, buyer != null ? buyer.phone : null,
                home != null ? home.name : null, r.task != null ? TASK_TYPES.get(r.task).label() : null);
    }

    public synchronized List<RobotView> robotViewsOf(User user) { return robotsOf(user).stream().map(this::robotView).toList(); }

    public synchronized List<RobotView> allRobotViews() { return robots.stream().map(this::robotView).toList(); }

    public synchronized HomeSummary homeSummary(String homeId) {
        Home h = home(homeId);
        return new HomeSummary(h.id, h.name, h.mapReady, h.mapping);
    }

    public synchronized List<Task> tasksOfHome(String homeId, int limit) {
        return tasks.stream().filter(t -> t.homeId.equals(homeId)).limit(limit).toList();
    }

    public synchronized List<Task> runningTasksOfHome(String homeId) {
        return tasks.stream().filter(t -> t.homeId.equals(homeId) && t.status.equals("running")).toList();
    }

    public synchronized List<String> fridgeOf(String homeId) { return fridge.getOrDefault(homeId, List.of()); }

    public synchronized List<Service> allServices() { return List.copyOf(services); }

    public synchronized List<Service> publishedServices() { return services.stream().filter(s -> s.status.equals("published")).toList(); }

    public synchronized Service service(String id) { return services.stream().filter(s -> s.id.equals(id)).findFirst().orElse(null); }

    /** 시리얼로 로봇을 가정에 연결한다. 판매점이 발급한(출하된) 시리얼만 등록된다. */
    public synchronized Map<String, Object> register(User user, String serial, String nickname) {
        Robot r = robot(serial);
        if (r == null) return error("등록되지 않은 시리얼 번호입니다. 판매점에서 받은 번호를 확인해 주세요.");
        if (r.homeId != null && !r.homeId.equals(user.homeId)) return error("이미 다른 가정에 연결된 로봇입니다. 고객센터에 문의해 주세요.");
        if (r.homeId != null) return error("이미 우리 집에 연결된 로봇입니다.");
        if (!user.role.equals("owner")) return error("로봇 연결은 가정 관리자만 할 수 있습니다.");
        r.homeId = user.homeId;
        r.nickname = !isEmpty(nickname) ? nickname : "로봇 " + (robotsOf(user).size() + 1);
        r.status = "idle"; r.registeredAt = Times.day(0); r.pos = new double[] {150, 170};
        log(r.serial, "info", "가정 연결 · " + user.name + " (" + home(user.homeId).name + ")");
        emit("robots");
        return ok("robot", robotView(r));
    }

    // ----- 멤버 -----
    public synchronized Members membersOf(String homeId) {
        Home h = home(homeId);
        List<MemberView> members = h.members.stream().map(m -> new MemberView(m.userId, m.role, m.robots, publicUser(user(m.userId)))).toList();
        return new Members(members, List.copyOf(h.invites));
    }

    public synchronized Map<String, Object> invite(User user, String email, String name, Object robotsArg) {
        Home h = home(user.homeId);
        if (!user.role.equals("owner")) return error("멤버 초대는 가정 관리자만 할 수 있습니다.");
        if (h.members.stream().anyMatch(m -> { User mu = user(m.userId); return mu != null && Objects.equals(mu.email, email); })) return error("이미 멤버입니다.");
        Invite inv = new Invite();
        inv.code = inviteCode(); inv.email = email; inv.name = name;
        inv.robots = robotsArg instanceof List<?> l && !l.isEmpty() ? robotsArg : "*";
        inv.createdAt = Times.nowIso(); inv.status = "pending";
        h.invites.add(inv);
        emit("members", h.id);
        return ok("invite", inv, "message", "초대 코드 " + inv.code + " 를 " + name + "님께 전달하세요. 앱에서 코드를 입력하면 멤버로 합류합니다.");
    }

    /** 6자리 영숫자 초대 코드 */
    private String inviteCode() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 6; i++) sb.append(Character.forDigit(random.nextInt(36), 36));
        return sb.toString().toUpperCase(Locale.ROOT);
    }

    public synchronized Map<String, Object> acceptInvite(String code, String email, String pw, String name, String phone) {
        for (Home h : homes) {
            Invite inv = h.invites.stream().filter(i -> i.code.equals(code) && i.status.equals("pending")).findFirst().orElse(null);
            if (inv == null) continue;
            User u = users.stream().filter(x -> Objects.equals(x.email, email)).findFirst().orElse(null);
            if (u == null) {
                u = new User(nid("u"), email, pw, !isEmpty(name) ? name : inv.name, phone, "member", h.id);
                users.add(u);
            } else {
                u.role = "member"; u.homeId = h.id;
            }
            h.members.add(new Member(u.id, "member", inv.robots));
            inv.status = "accepted";
            emit("members", h.id);
            return login(email, u.pw);
        }
        return error("유효하지 않은 초대 코드입니다.");
    }

    public synchronized Map<String, Object> setMemberRobots(User user, String userId, Object robotsArg) {
        Home h = home(user.homeId);
        if (!user.role.equals("owner")) return error("권한이 없습니다.");
        Member m = h.members.stream().filter(x -> x.userId.equals(userId)).findFirst().orElse(null);
        if (m == null || m.role.equals("owner")) return error("변경할 수 없는 멤버입니다.");
        m.robots = Models.isAll(robotsArg) ? "*" : robotsArg instanceof List<?> ? robotsArg : new ArrayList<String>();
        emit("members", h.id);
        return ok();
    }

    public synchronized Map<String, Object> removeMember(User user, String userId) {
        Home h = home(user.homeId);
        if (!user.role.equals("owner") || userId.equals(user.id)) return error("권한이 없습니다.");
        h.members.removeIf(m -> m.userId.equals(userId));
        emit("members", h.id);
        return ok();
    }

    // ----- 작업 -----
    public synchronized Map<String, Object> createTask(User user, String type, String serial) {
        TaskType tt = type == null ? null : TASK_TYPES.get(type);
        if (tt == null) return error("알 수 없는 작업: " + (type == null ? "undefined" : type));
        List<Robot> mine = robotsOf(user);
        Robot r;
        if (!isEmpty(serial)) {
            r = mine.stream().filter(x -> x.serial.equals(serial)).findFirst().orElse(null);
        } else {
            // 대기 중 배터리 최대 → 가동 중 → 그 외
            r = mine.stream().filter(x -> x.status.equals("idle")).max(Comparator.comparingInt(x -> x.battery))
                    .or(() -> mine.stream().filter(x -> x.status.equals("run")).findFirst())
                    .or(() -> mine.stream().findFirst())
                    .orElse(null);
        }
        if (r == null) return error("지금 작업을 받을 수 있는 로봇이 없습니다.");
        if (r.status.equals("error")) return error(r.nickname + "은(는) 오류 상태(" + r.errorCode + ")라 작업을 받을 수 없습니다.");
        if (r.status.equals("charge") && r.battery < 30) return error(r.nickname + "은(는) 배터리 " + r.battery + "%로 충전이 먼저입니다.");
        Task t = task(r.serial, user.homeId, type, "running", 0, user.id);
        tasks.addFirst(t);
        r.status = "run"; r.task = type;
        log(r.serial, "info", "작업 시작 · " + tt.label() + " (" + user.name + ")");
        emit("robots");
        emit("tasks", user.homeId);
        return ok("task", t, "robot", robotView(r),
                "message", r.nickname + "이(가) " + tt.label() + " 작업을 시작했습니다. 약 " + tt.minutes() + "분 예상.");
    }

    public synchronized Map<String, Object> stopTask(User user, String id) {
        Task t = tasks.stream().filter(x -> x.id.equals(id) && x.homeId.equals(user.homeId)).findFirst().orElse(null);
        if (t == null || !t.status.equals("running")) return error("진행 중인 작업이 아닙니다.");
        t.status = "stopped";
        Robot r = robot(t.serial);
        r.status = "idle"; r.task = null;
        log(r.serial, "warn", "작업 중지 · " + TASK_TYPES.get(t.type).label() + " (" + user.name + ")");
        emit("robots");
        emit("tasks", user.homeId);
        return ok();
    }

    // ----- 수동 제어 -----
    /** 관절(joint+angle) · 이동(move) · 초기화(home) 중 하나 */
    public synchronized Map<String, Object> control(User user, String serial, String joint, double angle, String move, boolean goHome) {
        Robot r = robotsOf(user).stream().filter(x -> x.serial.equals(serial)).findFirst().orElse(null);
        if (r == null) return error("제어 권한이 없는 로봇입니다.");
        if (r.status.equals("run")) return error("작업 중에는 수동 제어를 할 수 없습니다. 작업을 먼저 중지하세요.");
        if (!isEmpty(joint)) {
            if (!r.joints.containsKey(joint)) return error("알 수 없는 관절");
            r.joints.put(joint, Math.max(-90, Math.min(90, angle)));
            log(r.serial, "info", "수동 제어 · " + joint + " " + Js.num(r.joints.get(joint)) + "°");
        } else if (!isEmpty(move)) {
            int step = 14;
            int[] delta = switch (move) {
                case "forward" -> new int[] {0, -step};
                case "back" -> new int[] {0, step};
                case "left" -> new int[] {-step, 0};
                case "right" -> new int[] {step, 0};
                default -> null;
            };
            if (delta == null) return error("알 수 없는 이동 명령");
            r.pos = new double[] {Math.max(8, Math.min(312, r.pos[0] + delta[0])), Math.max(8, Math.min(192, r.pos[1] + delta[1]))};
            log(r.serial, "info", "수동 이동 · " + move + " → " + roomOf(r.pos));
        } else if (goHome) {
            r.pos = new double[] {150, 170};
            r.joints = zeroJoints();
            log(r.serial, "info", "초기 자세 · 홈베이스 복귀");
        } else {
            return error("joint|move|home 중 하나");
        }
        r.status = goHome ? "idle" : "manual";
        emit("robots");
        return ok("robot", robotView(r));
    }

    /** 맵 스캔: 0.7초마다 20%씩 진행해 100%가 되면 지도 완성 */
    public synchronized Map<String, Object> startMapping(User user) {
        Home h = home(user.homeId);
        h.mapping = 0; h.mapReady = false;
        emit("map", h.id);
        scheduleMappingTick(h);
        return ok();
    }

    private void scheduleMappingTick(Home h) {
        scheduler.schedule(() -> {
            synchronized (this) {
                h.mapping = (h.mapping == null ? 0 : h.mapping) + 20;
                if (h.mapping >= 100) { h.mapping = null; h.mapReady = true; }
                emit("map", h.id);
                if (!h.mapReady) scheduleMappingTick(h);
            }
        }, 700, TimeUnit.MILLISECONDS);
    }

    // ----- 이슈 (슈퍼어드민) -----
    public synchronized Map<String, Object> createIssue(User user, String serial, String title, String severity) {
        Issue i = new Issue();
        i.id = nid("i"); i.serial = serial; i.userId = user.id; i.contact = user.phone; i.title = title; i.status = "open";
        i.severity = severity != null ? severity : "medium"; i.createdAt = Times.nowIso();
        issues.addFirst(i);
        emit("issues");
        return ok("issue", i);
    }

    public synchronized IssueView issueView(Issue i) {
        User u = user(i.userId);
        Robot r = i.serial == null ? null : robot(i.serial);
        Home h = r != null && r.homeId != null ? home(r.homeId) : null;
        return new IssueView(i.id, i.serial, i.userId, i.contact, i.title, i.status, i.severity, i.createdAt, List.copyOf(i.notes),
                u != null ? u.name : null, u != null ? u.email : null, h != null ? h.name : null, r != null ? r.status : null);
    }

    public synchronized List<IssueView> allIssueViews() { return issues.stream().map(this::issueView).toList(); }

    public synchronized List<IssueView> openIssueViews() {
        return issues.stream().filter(i -> !i.status.equals("closed")).map(this::issueView).toList();
    }

    public synchronized Map<String, Object> updateIssue(User admin, String id, String status, String note) {
        Issue i = issues.stream().filter(x -> x.id.equals(id)).findFirst().orElse(null);
        if (i == null) return error("이슈 없음");
        if (!isEmpty(status)) i.status = status;
        if (!isEmpty(note)) i.notes.add(new Note(Times.nowIso(), admin.name, note));
        emit("issues");
        return ok("issue", issueView(i));
    }

    /** ID·이메일·이름·연락처 부분 일치 (어드민 계정 제외) */
    public synchronized List<FoundUser> searchUsers(String query) {
        String q = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        if (q.isEmpty()) return List.of();
        return users.stream()
                .filter(u -> !u.role.equals("admin") && Stream.of(u.id, u.email, u.name, u.phone).anyMatch(v -> v != null && v.toLowerCase(Locale.ROOT).contains(q)))
                .map(u -> {
                    Home h = u.homeId == null ? null : home(u.homeId);
                    List<String> serials = robots.stream().filter(r -> Objects.equals(r.homeId, u.homeId)).map(r -> r.serial).toList();
                    return new FoundUser(u.id, u.email, u.name, u.phone, u.role, u.homeId, h != null ? h.name : null, serials);
                })
                .toList();
    }

    // ----- 원격 조치 -----
    public synchronized Map<String, Object> remedy(User admin, String serial, String action) {
        Robot r = robot(serial);
        if (r == null) return error("로봇 없음");
        String msg = action == null ? null : switch (action) {
            case "reboot" -> "원격 재부팅";
            case "recalibrate" -> "관절 캘리브레이션";
            case "clear_error" -> "오류 해제 · 안전 점검 통과";
            case "firmware" -> "펌웨어 2.4.2 푸시";
            default -> null;
        };
        if (msg == null) return error("reboot|recalibrate|clear_error|firmware");
        log(r.serial, "info", msg + " (" + admin.name + ")");
        if (action.equals("clear_error") || action.equals("reboot")) { r.errorCode = null; r.status = "idle"; r.task = null; }
        if (action.equals("firmware")) r.firmware = "2.4.2";
        emit("robots");
        return ok("message", r.serial + " · " + msg + " 완료");
    }

    // ----- 서비스 업데이트 -----
    /** 서비스 등록·수정. id 가 기존 서비스면 보낸 필드만 덮어쓰고, 아니면 초안으로 새로 만든다. */
    public synchronized Map<String, Object> upsertService(User admin, ServiceFields s) {
        Service svc = !isEmpty(s.id()) ? service(s.id()) : null;
        if (svc == null) {
            svc = new Service();
            svc.id = nid("svc");
            if (!isEmpty(s.id())) svc.id = s.id();
            svc.status = "draft";
            services.add(svc);
        }
        s.applyTo(svc);
        emit("services");
        return ok("service", svc);
    }

    /** 서비스 등록 요청에서 받은 필드. null 은 보내지 않은 필드 */
    public record ServiceFields(String id, String name, String kind, String version, String author, String status,
                                Integer rolloutPct, String size, String changelog, List<String> installed) {
        void applyTo(Service svc) {
            if (name != null) svc.name = name;
            if (kind != null) svc.kind = kind;
            if (version != null) svc.version = version;
            if (author != null) svc.author = author;
            if (status != null) svc.status = status;
            if (rolloutPct != null) svc.rolloutPct = rolloutPct;
            if (size != null) svc.size = size;
            if (changelog != null) svc.changelog = changelog;
            if (installed != null) svc.installed = new ArrayList<>(installed);
        }
    }

    public synchronized Map<String, Object> publishService(User admin, String id, int rolloutPct) {
        Service svc = service(id);
        if (svc == null) return error("서비스 없음");
        svc.status = "published";
        svc.rolloutPct = Math.max(0, Math.min(100, rolloutPct));
        List<Robot> eligible = robots.stream().filter(r -> r.homeId != null && !svc.installed.contains(r.serial)).toList();
        int n = (int) Math.round(eligible.size() * svc.rolloutPct / 100.0);
        for (Robot r : eligible.subList(0, n)) {
            svc.installed.add(r.serial);
            log(r.serial, "info", "서비스 설치 · " + svc.name + " v" + svc.version);
        }
        emit("services");
        return ok("service", svc, "message", svc.name + " 배포 " + svc.rolloutPct + "% · 신규 설치 " + n + "대");
    }

    public synchronized Map<String, Object> installService(User user, String id, String serial) {
        Service svc = service(id);
        Robot r = robotsOf(user).stream().filter(x -> x.serial.equals(serial)).findFirst().orElse(null);
        if (svc == null || r == null) return error("서비스 또는 로봇 없음");
        if (!svc.status.equals("published")) return error("아직 배포되지 않은 서비스입니다.");
        if (!svc.installed.contains(r.serial)) {
            svc.installed.add(r.serial);
            log(r.serial, "info", "서비스 설치 · " + svc.name + " v" + svc.version);
        }
        emit("services");
        return ok("message", r.nickname + "에 " + svc.name + "을(를) 설치했습니다.");
    }

    // ----- 시뮬레이션 틱 (4초) -----
    public synchronized void tick() {
        boolean changed = false;
        for (Robot r : robots) {
            if (r.status.equals("run")) { r.battery = Math.max(3, r.battery - (random.nextDouble() < 0.5 ? 1 : 0)); changed = true; }
            if (r.status.equals("charge")) {
                r.battery = Math.min(100, r.battery + 2);
                changed = true;
                if (r.battery >= 95) { r.status = "idle"; log(r.serial, "info", "충전 완료"); }
            }
            if (r.status.equals("run") && r.battery <= 8) { r.status = "charge"; r.task = null; r.pos = new double[] {200, 185}; log(r.serial, "warn", "배터리 부족 · 충전소 복귀"); }
            if (r.status.equals("run") && random.nextDouble() < 0.7) {
                r.pos = new double[] {Math.max(8, Math.min(312, r.pos[0] + (random.nextDouble() * 16 - 8))), Math.max(8, Math.min(192, r.pos[1] + (random.nextDouble() * 16 - 8)))};
                changed = true;
            }
            r.lastSeen = Times.nowIso();
        }
        for (Task t : tasks) {
            if (!t.status.equals("running")) continue;
            t.progress = Math.min(100, t.progress + (int) Math.ceil(100.0 / (TASK_TYPES.get(t.type).minutes() * 2)));
            if (t.progress >= 100) {
                t.status = "done";
                Robot r = robot(t.serial);
                if (r != null) { r.status = "idle"; r.task = null; log(r.serial, "info", "작업 완료 · " + TASK_TYPES.get(t.type).label()); }
            }
            emit("tasks", t.homeId);
        }
        if (changed) emit("robots");
    }

    // ----- 대화 도구용 조회 -----
    public synchronized List<User> allUsers() { return List.copyOf(users); }

    public synchronized User userByEmail(String email) { return users.stream().filter(u -> Objects.equals(u.email, email)).findFirst().orElse(null); }

    static boolean isEmpty(String s) { return s == null || s.isEmpty(); }
}
