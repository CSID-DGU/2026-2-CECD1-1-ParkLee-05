package com.zipsa.lite.web;

import org.springframework.http.ResponseEntity;

import java.util.Map;

final class Replies {

    /** { error } 가 있으면 400, 아니면 200 */
    static ResponseEntity<Map<String, Object>> reply(Map<String, Object> r) {
        return ResponseEntity.status(r != null && r.containsKey("error") ? 400 : 200).body(r);
    }

    /** 쿼리의 숫자 (Number(x) || 기본값) */
    static int limit(String raw, int fallback) {
        if (raw == null || raw.isBlank()) return fallback;
        try {
            int n = (int) Double.parseDouble(raw.trim());
            return n > 0 ? n : fallback;
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private Replies() {}
}
