package com.zipsa.lite.web;

import com.zipsa.lite.store.Models.User;
import com.zipsa.lite.store.Store;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Authorization: Bearer 토큰으로 사용자를 찾고 역할을 검사한다.
 * 사용자 API 는 admin 을, 어드민 API 는 비-admin 을 403 으로 거부한다.
 */
@Component
public class Auth {

    private final Store store;

    public Auth(Store store) { this.store = store; }

    /** 로그인한 누구나 */
    public User any(String authorization) {
        String token = authorization == null ? "" : authorization.replaceFirst("^Bearer ", "");
        User u = store.userByToken(token);
        if (u == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        return u;
    }

    /** 가정 관리자·멤버 (어드민 제외) */
    public User user(String authorization) {
        User u = any(authorization);
        if (u.role.equals("admin")) throw new ApiException(HttpStatus.FORBIDDEN, "사용자 계정으로 로그인하세요.");
        return u;
    }

    /** 슈퍼어드민 */
    public User admin(String authorization) {
        User u = any(authorization);
        if (!u.role.equals("admin")) throw new ApiException(HttpStatus.FORBIDDEN, "관리자 권한이 필요합니다.");
        return u;
    }
}
