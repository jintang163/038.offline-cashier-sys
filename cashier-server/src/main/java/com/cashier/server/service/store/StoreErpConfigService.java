package com.cashier.server.service.store;

import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.dto.store.StoreErpConfigDTO;
import com.cashier.server.entity.store.StoreErpConfig;

public interface StoreErpConfigService extends IService<StoreErpConfig> {

    StoreErpConfig getByStoreId(Long storeId);

    StoreErpConfig getByStoreCode(String storeCode);

    StoreErpConfig createOrUpdateConfig(StoreErpConfigDTO dto);

    void deleteConfig(Long storeId);

    StoreErpConfig resolveEffectiveConfig(Long storeId);
}
