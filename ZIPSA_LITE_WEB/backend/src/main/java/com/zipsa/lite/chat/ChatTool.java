package com.zipsa.lite.chat;

import tools.jackson.databind.JsonNode;

import java.util.Map;
import java.util.function.Function;

/**
 * 대화 에이전트 도구. 실행 결과는 모델에게 줄 result 와 화면에 띄울 card(없으면 null)로 나뉜다.
 * inputSchema 는 Messages API 의 input_schema 그대로다.
 */
public record ChatTool(String name, String description, Map<String, Object> inputSchema, Function<JsonNode, Output> run) {

    public record Output(Object result, Object card) {
        public static Output of(Object result) { return new Output(result, null); }
    }
}
