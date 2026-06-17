package com.cashier.server.dto.store;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class StoreSyncOverviewDTO {
    private Long storeId;
    private String storeCode;
    private String storeName;
    private Integer isOnline;
    private LocalDateTime lastHeartbeatTime;
    private List<SyncTypeStatus> syncStatuses;
    private Integer totalUnsyncedCount;
    private Integer totalFailedCount;
    private BigDecimal totalUnsyncedAmount;

    @Data
    public static class SyncTypeStatus {
        private String syncType;
        private LocalDateTime lastSyncTime;
        private Integer lastSyncStatus;
        private String lastSyncError;
        private Integer unsyncedCount;
        private Integer failedCount;
        private Integer erpPushStatus;
        private LocalDateTime lastErpPushTime;
        private String erpPushError;
    }
}
