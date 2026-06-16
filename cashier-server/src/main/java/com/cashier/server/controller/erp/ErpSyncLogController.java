package com.cashier.server.controller.erp;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.Result;
import com.cashier.server.dto.erp.ErpSyncLogQueryDTO;
import com.cashier.server.dto.erp.ErpSyncStatisticsDTO;
import com.cashier.server.entity.erp.ErpSyncLog;
import com.cashier.server.service.erp.ErpSyncLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/erp/sync-log")
public class ErpSyncLogController {

    @Autowired
    private ErpSyncLogService syncLogService;

    @GetMapping("/page")
    public Result<IPage<ErpSyncLog>> page(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) Long configId,
            @RequestParam(required = false) String businessType,
            @RequestParam(required = false) String syncDirection,
            @RequestParam(required = false) Integer syncStatus,
            @RequestParam(required = false) String businessId,
            @RequestParam(required = false) String batchNo,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime endTime) {
        ErpSyncLogQueryDTO queryDTO = new ErpSyncLogQueryDTO();
        queryDTO.setPageNum(pageNum);
        queryDTO.setPageSize(pageSize);
        queryDTO.setConfigId(configId);
        queryDTO.setBusinessType(businessType);
        queryDTO.setSyncDirection(syncDirection);
        queryDTO.setSyncStatus(syncStatus);
        queryDTO.setBusinessId(businessId);
        queryDTO.setBatchNo(batchNo);
        queryDTO.setStartTime(startTime);
        queryDTO.setEndTime(endTime);
        return Result.success(syncLogService.queryPage(queryDTO));
    }

    @GetMapping("/{id}")
    public Result<ErpSyncLog> getById(@PathVariable Long id) {
        return Result.success(syncLogService.getById(id));
    }

    @GetMapping("/statistics")
    public Result<ErpSyncStatisticsDTO> statistics(@RequestParam(required = false) Long configId) {
        return Result.success(syncLogService.getStatistics(configId));
    }

    @PostMapping("/retry/{id}")
    public Result<Void> retry(@PathVariable Long id) {
        boolean success = syncLogService.resetLogForRetry(id);
        return success ? Result.success() : Result.fail("重试失败");
    }

    @PostMapping("/batch-retry")
    public Result<Void> batchRetry(@RequestBody java.util.List<Long> ids) {
        if (ids != null) {
            for (Long id : ids) {
                syncLogService.asyncResetForRetry(id);
            }
        }
        return Result.success();
    }
}
