package com.zipsa.lite.ws;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final LiveHub hub;

    public WebSocketConfig(LiveHub hub) { this.hub = hub; }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // 토큰으로 인증하므로 출처는 제한하지 않는다 (개발 중 Vite 프록시 경유 포함)
        registry.addHandler(hub, "/ws").setAllowedOriginPatterns("*");
    }
}
