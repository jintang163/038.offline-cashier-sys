package com.cashier.server.controller.fraud;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.Result;
import com.cashier.server.entity.fraud.SuspiciousStore;
import com.cashier.server.service.fraud.SuspiciousStoreService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/fraud/suspicious-stores")
public class SuspiciousStoreController {

    @Autowired
    private SuspiciousStoreService suspiciousStoreService;

    @GetMapping("/list")
    public Result<IPage<SuspiciousStore>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String riskLevel,
            @RequestParam(required = false) String status) {
        return Result.success(suspiciousStoreService.getSuspiciousStoreList(page, size, riskLevel, status));
    }

    @GetMapping("/{id}")
    public Result<SuspiciousStore> detail(@PathVariable Long id) {
        return Result.success(suspiciousStoreService.getById(id));
    }

    @GetMapping("/store/{storeId}")
    public Result<SuspiciousStore> getByStoreId(@PathVariable Long storeId) {
        return Result.success(suspiciousStoreService.getByStoreId(storeId));
    }

    @GetMapping("/high-risk")
    public Result<List<SuspiciousStore>> getHighRiskStores() {
        return Result.success(suspiciousStoreService.getHighRiskStores());
    }

    @PostMapping("/{storeId}/analyze")
    public Result<Map<String, Object>> analyzeStoreFraud(@PathVariable Long storeId) {
        return Result.success(suspiciousStoreService.analyzeStoreFraud(storeId));
    }

    @PostMapping("/{id}/handle")
    public Result<Void> handle(
            @PathVariable Long id,
            @RequestBody Map<String, Object> params) {
        String status = params.get("status") != null ? params.get("status").toString() : null;
        Long handlerId = params.get("handlerId") != null ? Long.valueOf(params.get("handlerId").toString()) : null;
        String handlerName = params.get("handlerName") != null ? params.get("handlerName").toString() : null;
        String handleRemark = params.get("handleRemark") != null ? params.get("handleRemark").toString() : null;
        suspiciousStoreService.handleSuspiciousStore(id, status, handlerId, handlerName, handleRemark);
        return Result.success();
    }
}
