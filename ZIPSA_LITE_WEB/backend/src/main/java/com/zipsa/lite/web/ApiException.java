package com.zipsa.lite.web;

import org.springframework.http.HttpStatus;

/** { error } 본문과 함께 내려갈 오류 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus status() { return status; }
}
