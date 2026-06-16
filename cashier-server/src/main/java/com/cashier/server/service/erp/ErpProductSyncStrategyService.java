package com.cashier.server.service.erp;

import com.cashier.server.entity.erp.ErpProductSyncStrategy;

public interface ErpProductSyncStrategyService {

    ErpProductSyncStrategy getByConfigId(Long configId);

    ErpProductSyncStrategy getById(Long id);

    boolean save(ErpProductSyncStrategy entity);

    boolean update(ErpProductSyncStrategy entity);

    boolean updateFullSyncStatus(Long configId, Integer enabled);

    boolean updateIncrementalSyncStatus(Long configId, Integer enabled);

    void updateLastFullSyncTime(Long configId);

    void updateLastIncrementalSyncTime(Long configId);
}
