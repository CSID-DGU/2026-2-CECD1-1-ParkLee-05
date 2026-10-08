package com.zipsa.lite.chat;

import java.util.LinkedHashMap;
import java.util.Map;

final class Maps {

    /** 순서를 지키는 Map (키, 값, 키, 값 …). null 값도 담는다 */
    static Map<String, Object> of(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]);
        return m;
    }

    private Maps() {}
}
