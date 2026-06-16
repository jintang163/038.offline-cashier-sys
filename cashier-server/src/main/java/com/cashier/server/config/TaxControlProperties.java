package com.cashier.server.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "tax.control")
public class TaxControlProperties {

    private String baseUrl;

    private String appKey;

    private String appSecret;

    private String sellerTaxNo;

    private String sellerName;

    private String sellerAddress;

    private String sellerBank;

    private String sellerPhone;

    private Integer timeout = 30000;

    private Integer retryTimes = 3;

    private Integer retryInterval = 5000;

    private BigDecimal defaultTaxRate = new BigDecimal("0.01");
}
