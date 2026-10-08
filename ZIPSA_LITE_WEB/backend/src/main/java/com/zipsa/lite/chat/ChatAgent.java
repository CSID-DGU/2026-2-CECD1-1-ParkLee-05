package com.zipsa.lite.chat;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.core.JsonValue;
import com.anthropic.core.ObjectMappers;
import com.anthropic.core.http.StreamResponse;
import com.anthropic.helpers.MessageAccumulator;
import com.anthropic.models.messages.ContentBlock;
import com.anthropic.models.messages.ContentBlockParam;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.MessageParam;
import com.anthropic.models.messages.RawMessageStreamEvent;
import com.anthropic.models.messages.StopReason;
import com.anthropic.models.messages.Tool;
import com.anthropic.models.messages.ToolResultBlockParam;
import com.anthropic.models.messages.ToolUseBlock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;

/**
 * Claude tool-use 루프 (PoC chat.js 이전). emit(event, data) 로 화면에 실시간 전달한다.
 *   delta {text} — 답변 글자 조각 / tool {name} — 지금 호출하는 도구 / card {...} — 화면 카드
 * API 키가 없거나 호출이 실패하면 준비된 답변으로 같은 도구를 직접 부른다.
 */
@Component
public class ChatAgent {

    private static final Logger log = LoggerFactory.getLogger(ChatAgent.class);
    private static final int MAX_ROUNDS = 5;

    /** 화면으로 이벤트를 보낸다 */
    public interface Emitter {
        void emit(String event, Object data);
    }

    public record Turn(String role, String content) {}

    private final AnthropicClient client;
    private final String model;
    private final JsonMapper json;
    private final Scripted scripted;

    public ChatAgent(@Value("${zipsa.llm.api-key:}") String apiKey, @Value("${zipsa.llm.model:claude-sonnet-5}") String model, JsonMapper json) {
        this.client = apiKey == null || apiKey.isBlank() ? null : AnthropicOkHttpClient.builder().fromEnv().apiKey(apiKey).build();
        this.model = model;
        this.json = json;
        this.scripted = new Scripted(json);
    }

    public boolean enabled() { return client != null; }

    public String model() { return model; }

    public Map<String, Object> runUser(String system, List<ChatTool> tools, List<Turn> messages, Emitter emit) {
        return run(system, tools, messages, emit, scripted.user());
    }

    public Map<String, Object> runAdmin(String system, List<ChatTool> tools, List<Turn> messages, Emitter emit) {
        return run(system, tools, messages, emit, scripted.admin());
    }

    private Map<String, Object> run(String system, List<ChatTool> tools, List<Turn> messages, Emitter emit,
                                    BiFunction<String, List<ChatTool>, Scripted.Reply> fallback) {
        if (client == null) return runScripted(tools, messages, emit, fallback, "no_api_key");

        List<MessageParam> convo = new ArrayList<>();
        for (Turn m : messages) {
            convo.add(MessageParam.builder().role(m.role().equals("user") ? MessageParam.Role.USER : MessageParam.Role.ASSISTANT).content(m.content()).build());
        }
        List<Tool> toolDefs = tools.stream().map(ChatAgent::toolDef).toList();
        StringBuilder full = new StringBuilder();
        try {
            for (int round = 0; round < MAX_ROUNDS; round++) {
                MessageCreateParams.Builder params = MessageCreateParams.builder().model(model).maxTokens(1024L).system(system).messages(convo);
                toolDefs.forEach(params::addTool);
                MessageAccumulator acc = MessageAccumulator.create();
                try (StreamResponse<RawMessageStreamEvent> stream = client.messages().createStreaming(params.build())) {
                    stream.stream().forEach(event -> {
                        acc.accumulate(event);
                        event.contentBlockDelta().flatMap(d -> d.delta().text()).ifPresent(t -> {
                            full.append(t.text());
                            emit.emit("delta", Map.of("text", t.text()));
                        });
                    });
                }
                Message msg = acc.message();
                if (!msg.stopReason().map(StopReason.TOOL_USE::equals).orElse(false)) break;

                convo.add(msg.toParam());
                List<ContentBlockParam> results = new ArrayList<>();
                for (ContentBlock block : msg.content()) {
                    if (block.toolUse().isEmpty()) continue;
                    ToolUseBlock use = block.toolUse().get();
                    emit.emit("tool", Map.of("name", use.name()));
                    ChatTool tool = tools.stream().filter(t -> t.name().equals(use.name())).findFirst().orElse(null);
                    ChatTool.Output out;
                    try {
                        out = tool != null ? tool.run().apply(input(use)) : ChatTool.Output.of(Map.of("error", "unknown tool"));
                    } catch (RuntimeException e) {
                        out = ChatTool.Output.of(Map.of("error", String.valueOf(e.getMessage())));
                    }
                    if (out.card() != null) emit.emit("card", out.card());
                    results.add(ContentBlockParam.ofToolResult(ToolResultBlockParam.builder()
                            .toolUseId(use.id())
                            .content(json.writeValueAsString(out.result()))
                            .build()));
                }
                convo.add(MessageParam.builder().role(MessageParam.Role.USER).contentOfBlockParams(results).build());
                if (!full.isEmpty() && full.charAt(full.length() - 1) != '\n') {
                    full.append('\n');
                    emit.emit("delta", Map.of("text", "\n"));
                }
            }
            return Maps.of("mode", "llm", "text", full.toString().strip());
        } catch (RuntimeException e) {
            // 네트워크·키 오류 시 시연이 멈추지 않도록 준비된 답변으로 넘어간다
            log.error("[chat] LLM 호출 실패 → 준비된 답변으로 전환: {}", e.getMessage());
            if (!full.isEmpty()) return Maps.of("mode", "llm", "text", full.toString().strip());
            return runScripted(tools, messages, emit, fallback, "llm_error");
        }
    }

    private Map<String, Object> runScripted(List<ChatTool> tools, List<Turn> messages, Emitter emit,
                                            BiFunction<String, List<ChatTool>, Scripted.Reply> fallback, String reason) {
        String last = "";
        for (int i = messages.size() - 1; i >= 0; i--) {
            if (messages.get(i).role().equals("user")) { last = messages.get(i).content(); break; }
        }
        Scripted.Reply r = fallback.apply(last, tools);
        for (Object card : r.cards()) emit.emit("card", card);
        emit.emit("delta", Map.of("text", r.text()));
        return Maps.of("mode", "scripted", "text", r.text(), "reason", reason);
    }

    /** 모델이 보낸 도구 입력을 JSON 트리로 */
    private JsonNode input(ToolUseBlock use) {
        try {
            String raw = ObjectMappers.jsonMapper().writeValueAsString(use._input());
            JsonNode node = json.readTree(raw);
            return node == null || node.isNull() ? json.createObjectNode() : node;
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            return json.createObjectNode();
        }
    }

    @SuppressWarnings("unchecked")
    private static Tool toolDef(ChatTool t) {
        Map<String, Object> schema = t.inputSchema();
        Tool.InputSchema.Properties.Builder props = Tool.InputSchema.Properties.builder();
        ((Map<String, Object>) schema.get("properties")).forEach((k, v) -> props.putAdditionalProperty(k, JsonValue.from(v)));
        Tool.InputSchema.Builder input = Tool.InputSchema.builder().properties(props.build());
        if (schema.containsKey("required")) input.required((List<String>) schema.get("required"));
        return Tool.builder().name(t.name()).description(t.description()).inputSchema(input.build()).build();
    }
}
