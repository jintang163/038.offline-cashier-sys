package com.cashier.server.service.store;

import com.cashier.server.common.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class StoreAggregationScheduler {

    private static final Logger log = LoggerFactory.getLogger(StoreAggregationScheduler.class);

    @Autowired
    private StoreAggregationService storeAggregationService;

    @Autowired
    private StoreSyncStatusService storeSyncStatusService;

    @Scheduled(cron = "0 0/30 * * * ?")
    public void aggregateOrderData() {
        log.info("开始定时汇总门店订单数据...");
        List<com.cashier.server.entity.store.StoreAggregationData> result =
                storeAggregationService.aggregateAllStoresData(Constants.SYNC_TYPE_ORDER);
        log.info("门店订单数据汇总完成, 数量: {}", result.size());
    }

    @Scheduled(cron = "0 0/30 * * * ?")
    public void aggregateRefundData() {
        log.info("开始定时汇总门店退款数据...");
        List<com.cashier.server.entity.store.StoreAggregationData> result =
                storeAggregationService.aggregateAllStoresData(Constants.SYNC_TYPE_REFUND);
        log.info("门店退款数据汇总完成, 数量: {}", result.size());
    }

    @Scheduled(cron = "0 0 1 * * ?")
    public void aggregateDailyReport() {
        log.info("开始定时汇总门店日报数据...");
        List<com.cashier.server.entity.store.StoreAggregationData> result =
                storeAggregationService.aggregateAllStoresData(Constants.SYNC_TYPE_DAILY_REPORT);
        log.info("门店日报数据汇总完成, 数量: {}", result.size());
    }

    @Scheduled(cron = "0 0/30 * * * ?")
    public void aggregateSalesSummary() {
        log.info("开始定时汇总门店销售汇总数据...");
        List<com.cashier.server.entity.store.StoreAggregationData> result =
                storeAggregationService.aggregateAllStoresData(Constants.SYNC_TYPE_SALES_SUMMARY);
        log.info("门店销售汇总数据汇总完成, 数量: {}", result.size());
    }

    @Scheduled(cron = "0 0/15 * * * ?")
    public void pushAggregationToErp() {
        log.info("开始定时推送门店汇总数据到ERP...");
        int count = storeAggregationService.batchPushPendingToErp();
        log.info("门店汇总数据ERP推送完成, 成功数量: {}", count);
    }

    @Scheduled(cron = "0 0/5 * * * ?")
    public void refreshStoreOnlineStatus() {
        storeSyncStatusService.refreshAllStoreSyncStatus();
    }
}
