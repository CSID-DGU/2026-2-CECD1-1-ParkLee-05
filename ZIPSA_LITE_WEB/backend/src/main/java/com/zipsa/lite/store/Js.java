package com.zipsa.lite.store;

import tools.jackson.databind.JsonNode;

import java.math.BigDecimal;

/** 요청 JSON 을 PoC(JavaScript)와 같은 규칙으로 읽기 위한 도우미 */
public final class Js {

    /** JS 의 truthy 판정 */
    public static boolean truthy(JsonNode n) {
        if (n == null || n.isNull() || n.isMissingNode()) return false;
        if (n.isBoolean()) return n.booleanValue();
        if (n.isNumber()) { double d = n.doubleValue(); return d != 0 && !Double.isNaN(d); }
        if (n.isString()) return !n.stringValue().isEmpty();
        return true;
    }

    /** Number(x) || 0 */
    public static double numberOrZero(JsonNode n) {
        if (n == null || n.isNull() || n.isMissingNode()) return 0;
        if (n.isNumber()) return n.doubleValue();
        if (n.isBoolean()) return n.booleanValue() ? 1 : 0;
        if (n.isString()) {
            String s = n.stringValue().trim();
            if (s.isEmpty()) return 0;
            try { return Double.parseDouble(s); } catch (NumberFormatException e) { return 0; }
        }
        return 0;
    }

    /** 문자열 값. 없거나 문자열이 아니면 null (JS 의 String 필드 접근과 같은 용도) */
    public static String str(JsonNode n) {
        if (n == null || n.isNull() || n.isMissingNode()) return null;
        return n.isString() ? n.stringValue() : n.toString();
    }

    public static JsonNode get(JsonNode body, String field) {
        return body == null ? null : body.get(field);
    }

    /** 숫자를 JS 처럼 표기 (30.0 → "30") */
    public static String num(double d) {
        if (d == Math.rint(d) && !Double.isInfinite(d)) return Long.toString((long) d);
        return BigDecimal.valueOf(d).stripTrailingZeros().toPlainString();
    }

    private Js() {}
}
