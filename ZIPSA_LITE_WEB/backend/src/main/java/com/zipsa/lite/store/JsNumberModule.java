package com.zipsa.lite.store;

import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueSerializer;
import tools.jackson.databind.module.SimpleModule;

/**
 * 실수를 JavaScript 처럼 쓴다: 정수 값이면 소수점 없이 (0.0 → 0, 150.0 → 150).
 * 관절 각도·위치 좌표 응답이 PoC 와 같은 JSON 이 되도록 한다.
 */
public class JsNumberModule extends SimpleModule {

    public JsNumberModule() {
        super("js-number");
        ValueSerializer<Double> number = new ValueSerializer<>() {
            @Override
            public void serialize(Double value, JsonGenerator gen, SerializationContext ctx) { write(value, gen); }
        };
        addSerializer(Double.class, number);
        addSerializer(Double.TYPE, number);
        addSerializer(double[].class, new ValueSerializer<>() {
            @Override
            public void serialize(double[] values, JsonGenerator gen, SerializationContext ctx) {
                gen.writeStartArray();
                for (double v : values) write(v, gen);
                gen.writeEndArray();
            }
        });
    }

    private static void write(double v, JsonGenerator gen) {
        if (v == Math.rint(v) && !Double.isInfinite(v) && Math.abs(v) < 1e15) gen.writeNumber((long) v);
        else gen.writeNumber(v);
    }
}
