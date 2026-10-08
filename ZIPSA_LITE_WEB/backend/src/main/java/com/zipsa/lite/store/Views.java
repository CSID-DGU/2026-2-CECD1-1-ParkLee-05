package com.zipsa.lite.store;

import com.zipsa.lite.store.Models.Buyer;
import com.zipsa.lite.store.Models.Contract;
import com.zipsa.lite.store.Models.Note;

import java.util.List;
import java.util.Map;

/** 화면용 조회 모델. 원본 객체에 계산 필드(구역, 잔여일, 구매자 등)를 덧붙인다. */
public final class Views {

    public record PublicUser(String id, String email, String name, String phone, String role, String homeId) {}

    public record RobotView(String serial, String model, String nickname, String homeId, String firmware, String status,
                            int battery, double[] pos, String task, Map<String, Double> joints, Contract contract, Buyer buyer,
                            String shippedAt, String registeredAt, String lastSeen, String errorCode,
                            String zone, Integer daysLeft, String buyerName, String buyerPhone, String homeName, String taskLabel) {}

    public record IssueView(String id, String serial, String userId, String contact, String title, String status, String severity,
                            String createdAt, List<Note> notes, String userName, String userEmail, String homeName, String robotStatus) {}

    public record HomeSummary(String id, String name, boolean mapReady, Integer mapping) {}

    public record MemberView(String userId, String role, Object robots, PublicUser user) {}

    public record Members(List<MemberView> members, List<Models.Invite> invites) {}

    public record FoundUser(String id, String email, String name, String phone, String role, String homeId, String homeName, List<String> robots) {}

    private Views() {}
}
