package com.zipsa.lite.store;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.Scheduled;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;

@Configuration
public class StoreConfig {

    /** 응답 JSON 의 숫자 표기를 PoC 와 같게 */
    @Bean
    public JsNumberModule jsNumberModule() {
        return new JsNumberModule();
    }

    /** 맵 스캔 진행처럼 잠시 뒤 실행할 일을 맡는다 */
    @Bean(destroyMethod = "shutdownNow")
    public ScheduledExecutorService storeScheduler() {
        return Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "store-scheduler");
            t.setDaemon(true);
            return t;
        });
    }

    @Bean
    public Store store(Store.Listener listener, ScheduledExecutorService storeScheduler) {
        return new Store(listener, storeScheduler);
    }

    /** 시뮬레이션 틱: 4초마다 배터리·위치·작업 진행률 갱신 (시험에서만 zipsa.simulation.enabled=false 로 끈다) */
    @Bean
    @ConditionalOnProperty(name = "zipsa.simulation.enabled", havingValue = "true", matchIfMissing = true)
    public SimulationTicker simulationTicker(Store store) {
        return new SimulationTicker(store);
    }

    public static class SimulationTicker {
        private final Store store;

        SimulationTicker(Store store) { this.store = store; }

        @Scheduled(fixedRate = 4000, initialDelay = 4000)
        public void tick() { store.tick(); }
    }
}
