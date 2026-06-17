package com.cashier.server.controller.fraud;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.Result;
import com.cashier.server.entity.fraud.OperationLockLog;
import com.cashier.server.service.fraud.OperationLockLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/fraud/locks")
public class OperationLockLogController {

    @Autowired
    private OperationLockLogService operationLockLogService;

    @GetMapping("/list")
    public Result<IPage<OperationLockLog>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String operationType,
            @RequestParam(required = false) Integer riskLevel,
            @RequestParam(required = false) Integer verifyStatus,
            @RequestParam(required = false) String storeId) {
        return Result.success(operationLockLogService.getLockLogList(
                page, size, operationType, riskLevel, verifyStatus, storeId));
    }

    @GetMapping("/{id}")
    public Result<OperationLockLog> detail(@PathVariable Long id) {
        return Result.success(operationLockLogService.getById(id));
    }

    @GetMapping("/pending")
    public Result<List<OperationLockLog>> getPendingVerifyLogs() {
        return Result.success(operationLockLogService.getPendingVerifyLogs());
    }

    @GetMapping("/statistics")
    public Result<Map<String, Object>> getStatistics() {
        return Result.success(operationLockLogService.getLockStatistics());
    }

    @PostMapping("/{id}/verify")
    public Result<Map<String, Object>> verify(
            @PathVariable Long id,
            @RequestBody Map<String, Object> params) {
        String managerUsername = params.get("managerUsername") != null ? params.get("managerUsername").toString() : null;
        String managerPassword = params.get("managerPassword") != null ? params.get("managerPassword").toString() : null;
        String verifyRemark = params.get("verifyRemark") != null ? params.get("verifyRemark").toString() : null;
        return Result.success(operationLockLogService.verifyOperationLock(
                id, managerUsername, managerPassword, verifyRemark));
    }

    @PostMapping("/sync")
    public Result<Map<String, Object>> sync(@RequestBody List<OperationLockLog> lockLogs) {
        return Result.success(operationLockLogService.syncOperationLockLogs(lockLogs));
    }
}
