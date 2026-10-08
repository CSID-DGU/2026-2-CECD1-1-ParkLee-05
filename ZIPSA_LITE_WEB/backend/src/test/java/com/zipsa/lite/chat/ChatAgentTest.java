package com.zipsa.lite.chat;

import com.zipsa.lite.store.JsNumberModule;
import com.zipsa.lite.store.Store;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;

class ChatAgentTest {

    @Test
    void 준비된_답변_요리_추천은_냉장고_재료를_근거로_카드를_낸다() {
        Store s = new Store((e, a) -> { }, Executors.newSingleThreadScheduledExecutor());
        ChatAgent agent = new ChatAgent("", "claude-sonnet-5", JsonMapper.builder().addModule(new JsNumberModule()).build());
        List<String> events = new ArrayList<>();
        Map<String, Object> out = agent.runUser("s", Tools.userTools(s, s.user("u_owner")),
                List.of(new ChatAgent.Turn("user", "냉장고에 뭐 있어? 요리 추천해줘")), (event, data) -> events.add(event));
        assertThat(out.get("mode")).isEqualTo("scripted");
        assertThat((String) out.get("text")).contains("김치찌개");
        assertThat(events).containsExactly("card", "delta");
    }
}
