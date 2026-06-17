package com.cashier.server.entity.store;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("store_sync_status")
public class StoreSyncStatus extends BaseEntity {
    private static final long serialVersionUID = 1L;
    private Long storeId;
    private String storeCode;
    private String storeName;
    private String syncType;
    private LocalDateTime lastSyncTime;
    private Integer lastSyncStatus;
    private String lastSyncError;
    private Integer unsyncedCount;
    private Integer failedCount;
    private Integer totalSyncedCount;
    private Integer totalFailedCount;
    private Integer avgSyncLatency;
    private Integer isOnline;
    private LocalDateTime lastHeartbeatTime;
    private Integer erpPushStatus;
    private LocalDateTime lastErpPushTime;
    private String erpPushError;
}
