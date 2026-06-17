package com.cashier.server.dto.store;

import lombok.Data;

@Data
public class StoreErpConfigDTO {
    private Long storeId;
    private String storeCode;
    private String erpType;
    private String baseUrl;
    private String authType;
    private String appKey;
    private String appSecret;
    private String username;
    private String password;
    private Integer timeout;
    private Integer retryTimes;
    private Integer retryInterval;
    private Integer pushOrderEnabled;
    private Integer pushStockEnabled;
    private Integer pushDailyReportEnabled;
    private Integer pushMemberEnabled;
    private Integer pushRefundEnabled;
}
