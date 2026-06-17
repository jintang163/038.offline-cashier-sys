package com.cashier.server.service.store;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.dto.store.StoreAggregationQueryDTO;
import com.cashier.server.entity.store.StoreAggregationData;

import java.util.List;

public interface StoreAggregationService extends IService<StoreAggregationData> {

    StoreAggregationData aggregateStoreData(Long storeId, String dataType);

    List<StoreAggregationData> aggregateAllStoresData(String dataType);

    IPage<StoreAggregationData> queryAggregationData(StoreAggregationQueryDTO queryDTO);

    boolean pushAggregationToErp(Long aggregationId);

    int batchPushPendingToErp();

    void markAggregationPushed(Long aggregationId, String erpBatchNo);

    void markAggregationPushFailed(Long aggregationId, String error);
}
