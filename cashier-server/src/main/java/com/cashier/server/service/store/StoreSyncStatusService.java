package com.cashier.server.service.store;

import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.dto.store.StoreSyncOverviewDTO;
import com.cashier.server.entity.store.StoreSyncStatus;

import java.util.List;

public interface StoreSyncStatusService extends IService<StoreSyncStatus> {

    StoreSyncStatus getByStoreAndType(Long storeId, String syncType);

    void updateSyncStatus(Long storeId, String storeCode, String storeName, String syncType,
                          Integer syncStatus, String syncError, Integer unsyncedCount, Integer failedCount);

    void updateOnlineStatus(Long storeId, Integer isOnline);

    List<StoreSyncOverviewDTO> getAllStoreSyncOverview();

    StoreSyncOverviewDTO getStoreSyncOverview(Long storeId);

    void refreshAllStoreSyncStatus();
}
