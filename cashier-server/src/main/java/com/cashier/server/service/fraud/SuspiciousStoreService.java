package com.cashier.server.service.fraud;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.fraud.SuspiciousStore;

import java.util.List;
import java.util.Map;

public interface SuspiciousStoreService extends IService<SuspiciousStore> {

    IPage<SuspiciousStore> getSuspiciousStoreList(Integer page, Integer size, String riskLevel, String status);

    SuspiciousStore getByStoreId(Long storeId);

    boolean createOrUpdateSuspiciousStore(Long storeId, String storeName, Integer riskScore, String riskLevel);

    boolean handleSuspiciousStore(Long id, String status, Long handlerId, String handlerName, String handleRemark);

    Map<String, Object> analyzeStoreFraud(Long storeId);

    List<SuspiciousStore> getHighRiskStores();
}
