package com.cashier.server.controller.erp;

import com.cashier.server.common.Result;
import com.cashier.server.entity.erp.ErpProductSyncStrategy;
import com.cashier.server.service.erp.ErpProductSyncStrategyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/erp/product-sync-strategy")
public class ErpProductSyncStrategyController {

    @Autowired
    private ErpProductSyncStrategyService productSyncStrategyService;

    @GetMapping("/config/{configId}")
    public Result<ErpProductSyncStrategy> getByConfigId(@PathVariable Long configId) {
        return Result.success(productSyncStrategyService.getByConfigId(configId));
    }

    @GetMapping("/{id}")
    public Result<ErpProductSyncStrategy> getById(@PathVariable Long id) {
        return Result.success(productSyncStrategyService.getById(id));
    }

    @PostMapping
    public Result<Void> save(@RequestBody ErpProductSyncStrategy entity) {
        boolean success = productSyncStrategyService.save(entity);
        return success ? Result.success() : Result.fail("保存失败");
    }

    @PutMapping
    public Result<Void> update(@RequestBody ErpProductSyncStrategy entity) {
        boolean success = productSyncStrategyService.update(entity);
        return success ? Result.success() : Result.fail("更新失败");
    }

    @PutMapping("/{configId}/full-sync/enabled")
    public Result<Void> updateFullSyncStatus(
            @PathVariable Long configId,
            @RequestParam Integer enabled) {
        boolean success = productSyncStrategyService.updateFullSyncStatus(configId, enabled);
        return success ? Result.success() : Result.fail("更新失败");
    }

    @PutMapping("/{configId}/incremental-sync/enabled")
    public Result<Void> updateIncrementalSyncStatus(
            @PathVariable Long configId,
            @RequestParam Integer enabled) {
        boolean success = productSyncStrategyService.updateIncrementalSyncStatus(configId, enabled);
        return success ? Result.success() : Result.fail("更新失败");
    }
}
