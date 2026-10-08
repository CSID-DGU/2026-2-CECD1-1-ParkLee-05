package com.zipsa.lite.store;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;

/** PoC 의 날짜 표기(toISOString)와 같은 형식을 만든다 */
final class Times {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC);
    private static final DateTimeFormatter HMS = DateTimeFormatter.ofPattern("HH:mm:ss");

    /** 오늘 기준 offsetDays 일 뒤 날짜 (UTC, YYYY-MM-DD) */
    static String day(int offsetDays) {
        return ISO.format(Instant.now().plus(offsetDays, ChronoUnit.DAYS)).substring(0, 10);
    }

    static String nowIso() { return ISO.format(Instant.now()); }

    /** 로컬 시각 HH:mm:ss */
    static String hhmmss() { return LocalTime.now().format(HMS); }

    /** 계약 종료일까지 남은 일수 (올림) */
    static int daysUntil(String date) {
        long end = Instant.parse(date + "T00:00:00Z").toEpochMilli();
        return (int) Math.ceil((end - System.currentTimeMillis()) / 86400000.0);
    }

    private Times() {}
}
