package com.zipsa.lite.store;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 작업 종류, 관절, 방 등 고정 정의 (/api/meta 로도 내려간다) */
public final class Catalog {

    public static final String ROBOT_MODEL = "ZIPSA H1";

    public record TaskType(String label, int minutes) {}

    /** 순서가 화면 버튼·도구 설명 순서가 되므로 LinkedHashMap 으로 둔다 */
    public static final Map<String, TaskType> TASK_TYPES;
    static {
        Map<String, TaskType> m = new LinkedHashMap<>();
        m.put("clean", new TaskType("청소", 25));
        m.put("laundry", new TaskType("세탁", 50));
        m.put("water", new TaskType("물 가져오기", 2));
        m.put("recommend_food", new TaskType("음식 추천", 1));
        m.put("unpack_grocery", new TaskType("배송 식자재 정리", 12));
        m.put("recipe_from_fridge", new TaskType("냉장고 재료로 요리 추천", 1));
        m.put("prep_cooking", new TaskType("요리 재료 세팅", 8));
        TASK_TYPES = java.util.Collections.unmodifiableMap(m);
    }

    public static final List<String> JOINTS = List.of("머리", "왼쪽 어깨", "왼쪽 팔꿈치", "왼쪽 손목", "오른쪽 어깨", "오른쪽 팔꿈치", "오른쪽 손목", "허리");

    public record Room(String id, String name, int x, int y, int w, int h) {}

    public static final List<Room> ROOMS = List.of(
            new Room("kitchen", "주방", 0, 0, 110, 80),
            new Room("room2", "작은방", 0, 80, 110, 60),
            new Room("entrance", "현관", 0, 140, 70, 60),
            new Room("living", "거실", 110, 0, 110, 200),
            new Room("master", "안방", 220, 0, 100, 110),
            new Room("bath", "욕실", 220, 110, 100, 90));

    /** 좌표가 속한 방 이름. 어느 방에도 없으면 거실 */
    public static String roomOf(double[] pos) {
        for (Room r : ROOMS) {
            if (pos[0] >= r.x() && pos[0] < r.x() + r.w() && pos[1] >= r.y() && pos[1] < r.y() + r.h()) return r.name();
        }
        return ROOMS.get(3).name();
    }

    private Catalog() {}
}
