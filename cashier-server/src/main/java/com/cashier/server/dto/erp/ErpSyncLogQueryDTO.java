package com.cashier.server.dto.erp;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ErpSyncLogQueryDTO {

    private Long configId;

    private String businessType;

    private String syncDirection;

    private Integer syncStatus;

    private String businessId;

    private String batchNo;

    private LocalDateTime startTime;

    private LocalDateTime endTime;

    private Integer pageNum = 1;

    private Integer pageSize = 20;
}
