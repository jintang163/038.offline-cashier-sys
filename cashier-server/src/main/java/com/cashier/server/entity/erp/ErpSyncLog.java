package com.cashier.server.entity.erp;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("erp_sync_log")
public class ErpSyncLog extends BaseEntity {

    private Long configId;

    private String businessType;

    private String syncDirection;

    private String syncType;

    private String batchNo;

    private String businessId;

    private String requestUrl;

    private String requestMethod;

    private String requestBody;

    private String responseBody;

    private Integer syncStatus;

    private String errorCode;

    private String errorMessage;

    private Integer retryCount;

    private Integer maxRetryCount;

    private LocalDateTime nextRetryTime;

    private Integer costTime;

    private LocalDateTime syncTime;
}
