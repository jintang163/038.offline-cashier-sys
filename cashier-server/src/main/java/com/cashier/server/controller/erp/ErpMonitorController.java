package com.cashier.server.controller.erp;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.cashier.server.common.Result;
import com.cashier.server.dto.erp.ErpSyncStatisticsDTO;
import com.cashier.server.entity.erp.ErpSyncLog;
import com.cashier.server.mapper.erp.ErpSyncLogMapper;
import com.cashier.server.service.erp.ErpSyncLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/erp/monitor")
public class ErpMonitorController {

    @Autowired
    private ErpSyncLogService syncLogService;

    @Autowired
    private ErpSyncLogMapper syncLogMapper;

    @GetMapping("/stats")
    public Result<Map<String, Object>> getStats(@RequestParam(required = false) Long configId) {
        ErpSyncStatisticsDTO stats = syncLogService.getStatistics(configId);
        Map<String, Object> result = new HashMap<>();
        result.put("total", stats.getTotalCount() != null ? stats.getTotalCount() : 0L);
        result.put("success", stats.getSuccessCount() != null ? stats.getSuccessCount() : 0L);
        result.put("failed", stats.getFailCount() != null ? stats.getFailCount() : 0L);
        result.put("pending", stats.getPendingCount() != null ? stats.getPendingCount() : 0L);
        result.put("processing", stats.getProcessingCount() != null ? stats.getProcessingCount() : 0L);
        long total = stats.getTotalCount() != null ? stats.getTotalCount() : 0L;
        long success = stats.getSuccessCount() != null ? stats.getSuccessCount() : 0L;
        result.put("successRate", total > 0 ? (double) success / total : 0.0);
        return Result.success(result);
    }

    @GetMapping("/today-stats")
    public Result<Map<String, Object>> getTodayStats(@RequestParam(required = false) Long configId) {
        LocalDateTime todayStart = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime todayEnd = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);

        LambdaQueryWrapper<ErpSyncLog> wrapper = new LambdaQueryWrapper<>();
        if (configId != null) {
            wrapper.eq(ErpSyncLog::getConfigId, configId);
        }
        wrapper.between(ErpSyncLog::getCreateTime, todayStart, todayEnd);

        long todayTotal = syncLogMapper.selectCount(wrapper);

        LambdaQueryWrapper<ErpSyncLog> successWrapper = new LambdaQueryWrapper<>();
        if (configId != null) {
            successWrapper.eq(ErpSyncLog::getConfigId, configId);
        }
        successWrapper.between(ErpSyncLog::getCreateTime, todayStart, todayEnd)
                .eq(ErpSyncLog::getSyncStatus, 2);
        long todaySuccess = syncLogMapper.selectCount(successWrapper);

        LambdaQueryWrapper<ErpSyncLog> failWrapper = new LambdaQueryWrapper<>();
        if (configId != null) {
            failWrapper.eq(ErpSyncLog::getConfigId, configId);
        }
        failWrapper.between(ErpSyncLog::getCreateTime, todayStart, todayEnd)
                .eq(ErpSyncLog::getSyncStatus, 3);
        long todayFailed = syncLogMapper.selectCount(failWrapper);

        Map<String, Object> result = new HashMap<>();
        result.put("todayTotal", todayTotal);
        result.put("todaySuccess", todaySuccess);
        result.put("todayFailed", todayFailed);
        return Result.success(result);
    }

    @GetMapping("/recent-failed")
    public Result<List<ErpSyncLog>> getRecentFailed(
            @RequestParam(required = false) Long configId,
            @RequestParam(defaultValue = "20") int limit) {
        LambdaQueryWrapper<ErpSyncLog> wrapper = new LambdaQueryWrapper<>();
        if (configId != null) {
            wrapper.eq(ErpSyncLog::getConfigId, configId);
        }
        wrapper.eq(ErpSyncLog::getSyncStatus, 3)
                .orderByDesc(ErpSyncLog::getCreateTime)
                .last("LIMIT " + limit);
        List<ErpSyncLog> list = syncLogMapper.selectList(wrapper);
        return Result.success(list);
    }
}
