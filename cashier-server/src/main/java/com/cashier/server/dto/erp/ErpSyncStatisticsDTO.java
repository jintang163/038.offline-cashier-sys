package com.cashier.server.dto.erp;

import lombok.Data;

@Data
public class ErpSyncStatisticsDTO {

    private Long totalCount;

    private Long successCount;

    private Long failCount;

    private Long pendingCount;

    private Long processingCount;

    private Double successRate;

    private Long todayTotal;

    private Long todaySuccess;

    private Long todayFail;

    public Double getSuccessRate() {
        if (totalCount == null || totalCount == 0) {
            return 0.0;
        }
        return (successCount == null ? 0 : successCount) * 100.0 / totalCount;
    }
}
