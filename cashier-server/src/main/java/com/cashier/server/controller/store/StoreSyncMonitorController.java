package com.cashier.server.controller.store;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.Result;
import com.cashier.server.common.UserContext;
import com.cashier.server.dto.store.StoreAggregationQueryDTO;
import com.cashier.server.dto.store.StoreSyncOverviewDTO;
import com.cashier.server.entity.store.StoreAggregationData;
import com.cashier.server.service.store.StoreAggregationService;
import com.cashier.server.service.store.StoreSyncStatusService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/store/monitor")
public class StoreSyncMonitorController {

    @Autowired
    private StoreSyncStatusService storeSyncStatusService;

    @Autowired
    private StoreAggregationService storeAggregationService;

    @GetMapping("/sync-overview")
    public Result<List<StoreSyncOverviewDTO>> allStoreSyncOverview() {
        return Result.success(storeSyncStatusService.getAllStoreSyncOverview());
    }

    @GetMapping("/{storeId}/sync-overview")
    public Result<StoreSyncOverviewDTO> storeSyncOverview(@PathVariable Long storeId) {
        return Result.success(storeSyncStatusService.getStoreSyncOverview(storeId));
    }

    @GetMapping("/my-sync-overview")
    public Result<StoreSyncOverviewDTO> myStoreSyncOverview() {
        Long storeId = UserContext.getCurrentStoreId();
        if (storeId == null) {
            return Result.success(null);
        }
        return Result.success(storeSyncStatusService.getStoreSyncOverview(storeId));
    }

    @PostMapping("/refresh-status")
    public Result<Void> refreshAllSyncStatus() {
        storeSyncStatusService.refreshAllStoreSyncStatus();
        return Result.success();
    }

    @PostMapping("/aggregate")
    public Result<Void> triggerAggregation(
            @RequestParam Long storeId,
            @RequestParam String dataType) {
        storeAggregationService.aggregateStoreData(storeId, dataType);
        return Result.success();
    }

    @PostMapping("/aggregate-all")
    public Result<Void> triggerAggregateAll(@RequestParam String dataType) {
        storeAggregationService.aggregateAllStoresData(dataType);
        return Result.success();
    }

    @GetMapping("/aggregation/list")
    public Result<IPage<StoreAggregationData>> aggregationList(StoreAggregationQueryDTO queryDTO) {
        return Result.success(storeAggregationService.queryAggregationData(queryDTO));
    }

    @PostMapping("/aggregation/{id}/push-erp")
    public Result<Boolean> pushAggregationToErp(@PathVariable Long id) {
        return Result.success(storeAggregationService.pushAggregationToErp(id));
    }

    @PostMapping("/aggregation/batch-push-erp")
    public Result<Integer> batchPushToErp() {
        return Result.success(storeAggregationService.batchPushPendingToErp());
    }
}
