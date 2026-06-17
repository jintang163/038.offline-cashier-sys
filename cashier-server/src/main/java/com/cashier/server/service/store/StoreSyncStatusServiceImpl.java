package com.cashier.server.service.store;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.dto.store.StoreSyncOverviewDTO;
import com.cashier.server.entity.store.Store;
import com.cashier.server.entity.store.StoreSyncStatus;
import com.cashier.server.mapper.store.StoreSyncStatusMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class StoreSyncStatusServiceImpl extends ServiceImpl<StoreSyncStatusMapper, StoreSyncStatus> implements StoreSyncStatusService {

    @Autowired
    private StoreService storeService;

    @Override
    public StoreSyncStatus getByStoreAndType(Long storeId, String syncType) {
        return lambdaQuery()
                .eq(StoreSyncStatus::getStoreId, storeId)
                .eq(StoreSyncStatus::getSyncType, syncType)
                .one();
    }

    @Override
    public void updateSyncStatus(Long storeId, String storeCode, String storeName, String syncType,
                                 Integer syncStatus, String syncError, Integer unsyncedCount, Integer failedCount) {
        StoreSyncStatus status = getByStoreAndType(storeId, syncType);
        if (status == null) {
            status = new StoreSyncStatus();
            status.setStoreId(storeId);
            status.setStoreCode(storeCode);
            status.setStoreName(storeName);
            status.setSyncType(syncType);
            status.setTotalSyncedCount(0);
            status.setTotalFailedCount(0);
        }
        status.setLastSyncTime(LocalDateTime.now());
        status.setLastSyncStatus(syncStatus);
        status.setLastSyncError(syncError);
        status.setUnsyncedCount(unsyncedCount != null ? unsyncedCount : 0);
        status.setFailedCount(failedCount != null ? failedCount : 0);
        if (syncStatus != null && syncStatus == 1) {
            status.setTotalSyncedCount(status.getTotalSyncedCount() + 1);
        } else if (syncStatus != null && syncStatus == 2) {
            status.setTotalFailedCount(status.getTotalFailedCount() + 1);
        }
        saveOrUpdate(status);
    }

    @Override
    public void updateOnlineStatus(Long storeId, Integer isOnline) {
        List<StoreSyncStatus> statuses = lambdaQuery()
                .eq(StoreSyncStatus::getStoreId, storeId)
                .list();
        for (StoreSyncStatus status : statuses) {
            status.setIsOnline(isOnline);
            status.setLastHeartbeatTime(LocalDateTime.now());
            updateById(status);
        }
    }

    @Override
    public List<StoreSyncOverviewDTO> getAllStoreSyncOverview() {
        List<Store> stores = storeService.getAllActiveStores();
        List<StoreSyncOverviewDTO> result = new ArrayList<>();
        for (Store store : stores) {
            StoreSyncOverviewDTO overview = getStoreSyncOverview(store.getId());
            result.add(overview);
        }
        return result;
    }

    @Override
    public StoreSyncOverviewDTO getStoreSyncOverview(Long storeId) {
        Store store = storeService.getById(storeId);
        StoreSyncOverviewDTO overview = new StoreSyncOverviewDTO();
        overview.setStoreId(storeId);
        overview.setStoreCode(store.getStoreCode());
        overview.setStoreName(store.getStoreName());

        List<StoreSyncStatus> statuses = lambdaQuery()
                .eq(StoreSyncStatus::getStoreId, storeId)
                .list();

        List<StoreSyncOverviewDTO.SyncTypeStatus> syncTypeStatuses = new ArrayList<>();
        int totalUnsynced = 0;
        int totalFailed = 0;
        boolean online = false;
        LocalDateTime lastHeartbeat = null;

        for (StoreSyncStatus s : statuses) {
            StoreSyncOverviewDTO.SyncTypeStatus sts = new StoreSyncOverviewDTO.SyncTypeStatus();
            sts.setSyncType(s.getSyncType());
            sts.setLastSyncTime(s.getLastSyncTime());
            sts.setLastSyncStatus(s.getLastSyncStatus());
            sts.setLastSyncError(s.getLastSyncError());
            sts.setUnsyncedCount(s.getUnsyncedCount());
            sts.setFailedCount(s.getFailedCount());
            sts.setErpPushStatus(s.getErpPushStatus());
            sts.setLastErpPushTime(s.getLastErpPushTime());
            sts.setErpPushError(s.getErpPushError());
            syncTypeStatuses.add(sts);
            totalUnsynced += s.getUnsyncedCount() != null ? s.getUnsyncedCount() : 0;
            totalFailed += s.getFailedCount() != null ? s.getFailedCount() : 0;
            if (s.getIsOnline() != null && s.getIsOnline() == 1) {
                online = true;
            }
            if (s.getLastHeartbeatTime() != null && (lastHeartbeat == null || s.getLastHeartbeatTime().isAfter(lastHeartbeat))) {
                lastHeartbeat = s.getLastHeartbeatTime();
            }
        }
        overview.setSyncStatuses(syncTypeStatuses);
        overview.setTotalUnsyncedCount(totalUnsynced);
        overview.setTotalFailedCount(totalFailed);
        overview.setIsOnline(online ? 1 : 0);
        overview.setLastHeartbeatTime(lastHeartbeat);
        return overview;
    }

    @Override
    public void refreshAllStoreSyncStatus() {
        List<Store> stores = storeService.getAllActiveStores();
        for (Store store : stores) {
            List<StoreSyncStatus> statuses = lambdaQuery()
                    .eq(StoreSyncStatus::getStoreId, store.getId())
                    .list();
            for (StoreSyncStatus status : statuses) {
                if (status.getLastHeartbeatTime() != null) {
                    long minutes = java.time.Duration.between(status.getLastHeartbeatTime(), LocalDateTime.now()).toMinutes();
                    status.setIsOnline(minutes < 5 ? 1 : 0);
                    updateById(status);
                }
            }
        }
    }
}
