package com.cashier.server.controller.erp;

import com.cashier.server.common.Result;
import com.cashier.server.entity.erp.ErpProductSyncStrategy;
import com.cashier.server.service.erp.ErpProductSyncStrategyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/erp/product-sync-strategy")
public class ErpProductSyncStrategyController {

    @Autowired
    private ErpProductSyncStrategyService productSyncStrategyService;

    @GetMapping("/config/{configId}")
    public Result<ErpProductSyncStrategy> getByConfigId(@PathVariable Long configId) {
        return Result.success(productSyncStrategyService.getByConfigId(configId));
    }

    @GetMapping("/{configId}")
    public Result<ErpProductSyncStrategy> getByConfigId2(@PathVariable Long configId) {
        return Result.success(productSyncStrategyService.getByConfigId(configId));
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

    @PutMapping("/full")
    public Result<Void> saveFullStrategy(@RequestBody Map<String, Object> params) {
        Long configId = params.get("configId") != null
                ? Long.valueOf(params.get("configId").toString()) : null;
        if (configId == null) {
            return Result.fail("configId不能为空");
        }
        ErpProductSyncStrategy strategy = productSyncStrategyService.getByConfigId(configId);
        if (strategy == null) {
            strategy = new ErpProductSyncStrategy();
            strategy.setConfigId(configId);
            if (params.get("fullEnabled") != null) {
                strategy.setFullEnabled(Integer.valueOf(params.get("fullEnabled").toString()));
            }
            if (params.get("fullCronExpression") != null) {
                strategy.setFullCronExpression(params.get("fullCronExpression").toString());
            }
            if (params.get("fullSyncFields") != null) {
                strategy.setFullSyncFields(params.get("fullSyncFields").toString());
            }
            productSyncStrategyService.save(strategy);
        } else {
            if (params.get("fullEnabled") != null) {
                strategy.setFullEnabled(Integer.valueOf(params.get("fullEnabled").toString()));
            }
            if (params.get("fullCronExpression") != null) {
                strategy.setFullCronExpression(params.get("fullCronExpression").toString());
            }
            if (params.get("fullSyncFields") != null) {
                strategy.setFullSyncFields(params.get("fullSyncFields").toString());
            }
            productSyncStrategyService.update(strategy);
        }
        return Result.success();
    }

    @PutMapping("/incremental")
    public Result<Void> saveIncrementalStrategy(@RequestBody Map<String, Object> params) {
        Long configId = params.get("configId") != null
                ? Long.valueOf(params.get("configId").toString()) : null;
        if (configId == null) {
            return Result.fail("configId不能为空");
        }
        ErpProductSyncStrategy strategy = productSyncStrategyService.getByConfigId(configId);
        if (strategy == null) {
            strategy = new ErpProductSyncStrategy();
            strategy.setConfigId(configId);
            if (params.get("incrementalEnabled") != null) {
                strategy.setIncrementalEnabled(Integer.valueOf(params.get("incrementalEnabled").toString()));
            }
            if (params.get("incrementalFixedInterval") != null) {
                strategy.setIncrementalFixedInterval(Integer.valueOf(params.get("incrementalFixedInterval").toString()));
            }
            if (params.get("incrementalField") != null) {
                strategy.setIncrementalField(params.get("incrementalField").toString());
            }
            if (params.get("incrementalSyncFields") != null) {
                strategy.setIncrementalSyncFields(params.get("incrementalSyncFields").toString());
            }
            productSyncStrategyService.save(strategy);
        } else {
            if (params.get("incrementalEnabled") != null) {
                strategy.setIncrementalEnabled(Integer.valueOf(params.get("incrementalEnabled").toString()));
            }
            if (params.get("incrementalFixedInterval") != null) {
                strategy.setIncrementalFixedInterval(Integer.valueOf(params.get("incrementalFixedInterval").toString()));
            }
            if (params.get("incrementalField") != null) {
                strategy.setIncrementalField(params.get("incrementalField").toString());
            }
            if (params.get("incrementalSyncFields") != null) {
                strategy.setIncrementalSyncFields(params.get("incrementalSyncFields").toString());
            }
            productSyncStrategyService.update(strategy);
        }
        return Result.success();
    }
}
