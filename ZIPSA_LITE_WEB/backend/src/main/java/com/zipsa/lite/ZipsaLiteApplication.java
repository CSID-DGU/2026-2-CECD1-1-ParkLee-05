package com.zipsa.lite;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ZipsaLiteApplication {

	public static void main(String[] args) {
		SpringApplication.run(ZipsaLiteApplication.class, args);
	}

}
