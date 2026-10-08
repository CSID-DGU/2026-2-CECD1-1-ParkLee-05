package com.zipsa.lite.store;

import com.zipsa.lite.store.Models.User;
import com.zipsa.lite.store.Views.RobotView;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;

import static org.assertj.core.api.Assertions.assertThat;

/** PoC 서버 단위 테스트(store.test.js) 이전 + 시뮬레이션 틱·맵 스캔 */
class StoreTest {

    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private final Store s = new Store((event, arg) -> { }, scheduler);

    @AfterEach
    void shutdown() { scheduler.shutdownNow(); }

    private User owner() { return s.user("u_owner"); }

    private User member() { return s.user("u_member"); }

    private static String error(Map<String, Object> r) { return (String) r.get("error"); }

    @Test
    void 출하된_시리얼만_등록되고_다른_집_로봇은_거부된다() {
        assertThat(s.register(owner(), "zh1-2606-0042", "셋째")).containsKey("ok");
        assertThat(s.robot("ZH1-2606-0042").homeId).isEqualTo("h1");
        assertThat(error(s.register(owner(), "ZH1-0000-9999", null))).contains("등록되지 않은");
        assertThat(error(s.register(owner(), "ZH1-2605-0017", null))).contains("다른 가정");
        assertThat(error(s.register(member(), "ZH1-2606-0043", null))).contains("관리자만");
    }

    @Test
    void 멤버는_허용된_로봇만_보고_초대_코드로_합류한다() {
        assertThat(s.robotsOf(member())).extracting(r -> r.serial).containsExactly("ZH1-2604-0001");
        Map<String, Object> inv = s.invite(owner(), "kid@demo.kr", "아이", List.of("ZH1-2604-0002"));
        assertThat(inv).containsKey("ok");
        String code = ((Models.Invite) inv.get("invite")).code;
        Map<String, Object> login = s.acceptInvite(code, "kid@demo.kr", "x", null, "010");
        assertThat(login).containsKey("token");
        assertThat(s.robotsOf(s.userByEmail("kid@demo.kr"))).extracting(r -> r.serial).containsExactly("ZH1-2604-0002");
    }

    @Test
    void 작업_생성_중지_오류_로봇과_저배터리_충전_로봇은_거부() {
        Map<String, Object> r = s.createTask(owner(), "water", null);
        assertThat(r).containsKey("ok");
        assertThat(((RobotView) r.get("robot")).status()).isEqualTo("run");
        assertThat(s.stopTask(owner(), ((Models.Task) r.get("task")).id)).containsKey("ok");
        assertThat(error(s.createTask(owner(), "clean", "ZH1-2604-0002"))).contains("충전");
        assertThat(error(s.createTask(s.user("u_park"), "clean", null))).contains("오류");
    }

    @Test
    void 수동_제어는_작업_중이면_거부_관절은_90도로_제한() {
        assertThat(error(s.control(owner(), "ZH1-2604-0001", "머리", 30, null, false))).contains("작업 중");
        Map<String, Object> r = s.control(owner(), "ZH1-2604-0002", "머리", 200, null, false);
        RobotView v = (RobotView) r.get("robot");
        assertThat(v.joints().get("머리")).isEqualTo(90.0);
        assertThat(v.status()).isEqualTo("manual");
    }

    @Test
    void 서비스_배포는_비율만큼_설치되고_계약_잔여일이_계산된다() {
        User admin = s.user("u_admin");
        int before = s.service("svc_pasta").installed.size();
        assertThat(s.publishService(admin, "svc_pasta", 100)).containsKey("ok");
        assertThat(s.service("svc_pasta").installed.size()).isGreaterThan(before);
        RobotView v = s.robotView(s.robot("ZH1-2605-0017"));
        assertThat(v.daysLeft()).isBetween(11, 12);
    }

    @Test
    void 틱마다_충전은_2퍼센트_오르고_작업_진행률은_예상시간으로_오른다() {
        int charging = s.robot("ZH1-2604-0002").battery;
        Models.Task task = (Models.Task) s.createTask(s.user("u_choi"), "water", null).get("task");
        s.tick();
        assertThat(s.robot("ZH1-2604-0002").battery).isEqualTo(charging + 2);
        assertThat(task.progress).isEqualTo(25); // 100 ÷ (2분 × 2)
        for (int i = 0; i < 3; i++) s.tick();
        assertThat(task.status).isEqualTo("done");
        assertThat(s.robot("ZH1-2605-0031").status).isEqualTo("idle");
    }

    @Test
    void 맵_스캔은_20퍼센트씩_진행해_지도를_완성한다() throws InterruptedException {
        s.startMapping(s.user("u_park"));
        assertThat(s.home("h2").mapping).isZero();
        Thread.sleep(700 * 5 + 400);
        assertThat(s.home("h2").mapReady).isTrue();
        assertThat(s.home("h2").mapping).isNull();
    }
}
