package com.cashier.server;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.socket.config.annotation.EnableWebSocket;

@SpringBootApplication
@MapperScan("com.cashier.server.mapper")
@EnableScheduling
@EnableWebSocket
public class CashierServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(CashierServerApplication.class, args);
    }
}
