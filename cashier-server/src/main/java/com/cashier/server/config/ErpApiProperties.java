package com.cashier.server.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "erp.api")
public class ErpApiProperties {

    private String baseUrl;

    private String appKey;

    private String appSecret;

    private Integer timeout = 30000;

    private Integer retryTimes = 3;

    private Integer retryInterval = 5000;
}
