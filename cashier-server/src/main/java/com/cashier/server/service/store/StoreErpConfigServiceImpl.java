package com.cashier.server.service.store;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.common.BusinessException;
import com.cashier.server.dto.store.StoreErpConfigDTO;
import com.cashier.server.entity.store.Store;
import com.cashier.server.entity.store.StoreErpConfig;
import com.cashier.server.mapper.store.StoreErpConfigMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StoreErpConfigServiceImpl extends ServiceImpl<StoreErpConfigMapper, StoreErpConfig> implements StoreErpConfigService {

    @Autowired
    private StoreService storeService;

    @Override
    public StoreErpConfig getByStoreId(Long storeId) {
        return lambdaQuery().eq(StoreErpConfig::getStoreId, storeId).one();
    }

    @Override
    public StoreErpConfig getByStoreCode(String storeCode) {
        return lambdaQuery().eq(StoreErpConfig::getStoreCode, storeCode).one();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public StoreErpConfig createOrUpdateConfig(StoreErpConfigDTO dto) {
        Store store = storeService.getByStoreCode(dto.getStoreCode());
        if (store == null) {
            throw new BusinessException("门店不存在: " + dto.getStoreCode());
        }
        StoreErpConfig existing = getByStoreId(store.getId());
        StoreErpConfig config = existing != null ? existing : new StoreErpConfig();
        config.setStoreId(store.getId());
        config.setStoreCode(store.getStoreCode());
        config.setErpType(dto.getErpType());
        config.setBaseUrl(dto.getBaseUrl());
        config.setAuthType(dto.getAuthType());
        config.setAppKey(dto.getAppKey());
        config.setAppSecret(dto.getAppSecret());
        config.setUsername(dto.getUsername());
        config.setPassword(dto.getPassword());
        config.setTimeout(dto.getTimeout());
        config.setRetryTimes(dto.getRetryTimes());
        config.setRetryInterval(dto.getRetryInterval());
        config.setPushOrderEnabled(dto.getPushOrderEnabled());
        config.setPushStockEnabled(dto.getPushStockEnabled());
        config.setPushDailyReportEnabled(dto.getPushDailyReportEnabled());
        config.setPushMemberEnabled(dto.getPushMemberEnabled());
        config.setPushRefundEnabled(dto.getPushRefundEnabled());
        if (existing == null) {
            save(config);
        } else {
            updateById(config);
        }
        store.setErpConfigMode(1);
        store.setErpConfigId(config.getId());
        storeService.updateById(store);
        return config;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteConfig(Long storeId) {
        StoreErpConfig config = getByStoreId(storeId);
        if (config != null) {
            removeById(config.getId());
            Store store = storeService.getById(storeId);
            if (store != null) {
                store.setErpConfigMode(0);
                store.setErpConfigId(null);
                storeService.updateById(store);
            }
        }
    }

    @Override
    public StoreErpConfig resolveEffectiveConfig(Long storeId) {
        Store store = storeService.getById(storeId);
        if (store == null) {
            throw new BusinessException("门店不存在: " + storeId);
        }
        if (store.getErpConfigMode() != null && store.getErpConfigMode() == 1) {
            return getByStoreId(storeId);
        }
        return null;
    }
}
