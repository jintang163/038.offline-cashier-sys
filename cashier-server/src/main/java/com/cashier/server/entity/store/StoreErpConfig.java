package com.cashier.server.entity.store;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("store_erp_config")
public class StoreErpConfig extends BaseEntity {
    private static final long serialVersionUID = 1L;
    private Long storeId;
    private String storeCode;
    private Long erpConfigId;
    private String erpType;
    private String baseUrl;
    private String authType;
    private String appKey;
    private String appSecret;
    private String token;
    private LocalDateTime tokenExpireTime;
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
    private Integer status;
    private LocalDateTime lastSyncTime;
    private LocalDateTime lastPushTime;
    private String remark;
}
