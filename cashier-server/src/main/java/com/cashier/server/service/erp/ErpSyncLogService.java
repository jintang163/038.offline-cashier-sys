package com.cashier.server.service.erp;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.cashier.server.dto.erp.ErpSyncLogQueryDTO;
import com.cashier.server.dto.erp.ErpSyncStatisticsDTO;
import com.cashier.server.entity.erp.ErpSyncLog;
import com.cashier.server.mapper.erp.ErpSyncLogMapper;
import com.cashier.server.websocket.WebSocketService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
public class ErpSyncLogService {

    private static final Logger log = LoggerFactory.getLogger(ErpSyncLogService.class);

    @Autowired
    private ErpSyncLogMapper syncLogMapper;

    @Autowired
    private WebSocketService webSocketService;

    public String generateBatchNo() {
        return "SYNC" + System.currentTimeMillis() + IdUtil.fastSimpleUUID().substring(0, 6);
    }

    public ErpSyncLog createLog(Long configId, String businessType, String syncDirection, String syncType) {
        ErpSyncLog syncLog = new ErpSyncLog();
        syncLog.setConfigId(configId);
        syncLog.setBusinessType(businessType);
        syncLog.setSyncDirection(syncDirection);
        syncLog.setSyncType(syncType);
        syncLog.setBatchNo(generateBatchNo());
        syncLog.setSyncStatus(0);
        syncLog.setRetryCount(0);
        syncLog.setMaxRetryCount(3);
        syncLog.setCostTime(0);
        syncLogMapper.insert(syncLog);
        return syncLog;
    }

    public void updateLogStart(Long logId, String requestUrl, String requestMethod, String requestBody) {
        ErpSyncLog syncLog = new ErpSyncLog();
        syncLog.setId(logId);
        syncLog.setRequestUrl(requestUrl);
        syncLog.setRequestMethod(requestMethod);
        syncLog.setRequestBody(requestBody);
        syncLog.setSyncStatus(1);
        syncLog.setSyncTime(LocalDateTime.now());
        syncLogMapper.updateById(syncLog);
    }

    public void updateLogSuccess(Long logId, String responseBody, Integer costTime) {
        ErpSyncLog syncLog = new ErpSyncLog();
        syncLog.setId(logId);
        syncLog.setResponseBody(responseBody);
        syncLog.setSyncStatus(2);
        syncLog.setCostTime(costTime);
        syncLog.setErrorMessage(null);
        syncLog.setErrorCode(null);
        syncLog.setNextRetryTime(null);
        syncLogMapper.updateById(syncLog);
        broadcastUpdate();
    }

    public void updateLogFail(Long logId, String responseBody, String errorCode, String errorMessage, Integer costTime) {
        ErpSyncLog syncLog = new ErpSyncLog();
        syncLog.setId(logId);
        syncLog.setResponseBody(responseBody);
        syncLog.setSyncStatus(3);
        syncLog.setErrorCode(errorCode);
        syncLog.setErrorMessage(errorMessage);
        syncLog.setCostTime(costTime);
        syncLog.setRetryCount(syncLog.getRetryCount() == null ? 1 : syncLog.getRetryCount() + 1);
        if (syncLog.getRetryCount() < (syncLog.getMaxRetryCount() == null ? 3 : syncLog.getMaxRetryCount())) {
            syncLog.setNextRetryTime(LocalDateTime.now().plusMinutes(5));
        }
        syncLogMapper.updateById(syncLog);
        broadcastUpdate();
    }

    public void updateBusinessId(Long logId, String businessId) {
        ErpSyncLog syncLog = new ErpSyncLog();
        syncLog.setId(logId);
        syncLog.setBusinessId(businessId);
        syncLogMapper.updateById(syncLog);
    }

    public ErpSyncLog getById(Long id) {
        return syncLogMapper.selectById(id);
    }

    public IPage<ErpSyncLog> queryPage(ErpSyncLogQueryDTO queryDTO) {
        Page<ErpSyncLog> page = new Page<>(queryDTO.getPageNum(), queryDTO.getPageSize());
        com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ErpSyncLog> wrapper =
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<>();

        if (queryDTO.getConfigId() != null) {
            wrapper.eq(ErpSyncLog::getConfigId, queryDTO.getConfigId());
        }
        if (StrUtil.isNotBlank(queryDTO.getBusinessType())) {
            wrapper.eq(ErpSyncLog::getBusinessType, queryDTO.getBusinessType());
        }
        if (StrUtil.isNotBlank(queryDTO.getSyncDirection())) {
            wrapper.eq(ErpSyncLog::getSyncDirection, queryDTO.getSyncDirection());
        }
        if (queryDTO.getSyncStatus() != null) {
            wrapper.eq(ErpSyncLog::getSyncStatus, queryDTO.getSyncStatus());
        }
        if (StrUtil.isNotBlank(queryDTO.getBusinessId())) {
            wrapper.like(ErpSyncLog::getBusinessId, queryDTO.getBusinessId());
        }
        if (StrUtil.isNotBlank(queryDTO.getBatchNo())) {
            wrapper.like(ErpSyncLog::getBatchNo, queryDTO.getBatchNo());
        }
        if (queryDTO.getStartTime() != null) {
            wrapper.ge(ErpSyncLog::getCreateTime, queryDTO.getStartTime());
        }
        if (queryDTO.getEndTime() != null) {
            wrapper.le(ErpSyncLog::getCreateTime, queryDTO.getEndTime());
        }
        wrapper.orderByDesc(ErpSyncLog::getCreateTime);

        return syncLogMapper.selectPage(page, wrapper);
    }

    public ErpSyncStatisticsDTO getStatistics(Long configId) {
        ErpSyncStatisticsDTO stats = new ErpSyncStatisticsDTO();

        com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ErpSyncLog> baseWrapper =
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<>();
        if (configId != null) {
            baseWrapper.eq(ErpSyncLog::getConfigId, configId);
        }

        com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ErpSyncLog> totalWrapper = baseWrapper.clone();
        stats.setTotalCount(syncLogMapper.selectCount(totalWrapper));

        com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ErpSyncLog> successWrapper = baseWrapper.clone();
        successWrapper.eq(ErpSyncLog::getSyncStatus, 2);
        stats.setSuccessCount(syncLogMapper.selectCount(successWrapper));

        com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ErpSyncLog> failWrapper = baseWrapper.clone();
        failWrapper.eq(ErpSyncLog::getSyncStatus, 3);
        stats.setFailCount(syncLogMapper.selectCount(failWrapper));

        com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ErpSyncLog> pendingWrapper = baseWrapper.clone();
        pendingWrapper.eq(ErpSyncLog::getSyncStatus, 0);
        stats.setPendingCount(syncLogMapper.selectCount(pendingWrapper));

        com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ErpSyncLog> processingWrapper = baseWrapper.clone();
        processingWrapper.eq(ErpSyncLog::getSyncStatus, 1);
        stats.setProcessingCount(syncLogMapper.selectCount(processingWrapper));

        LocalDateTime todayStart = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime todayEnd = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);

        com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ErpSyncLog> todayTotalWrapper = baseWrapper.clone();
        todayTotalWrapper.between(ErpSyncLog::getCreateTime, todayStart, todayEnd);
        stats.setTodayTotal(syncLogMapper.selectCount(todayTotalWrapper));

        com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ErpSyncLog> todaySuccessWrapper = baseWrapper.clone();
        todaySuccessWrapper.between(ErpSyncLog::getCreateTime, todayStart, todayEnd)
                .eq(ErpSyncLog::getSyncStatus, 2);
        stats.setTodaySuccess(syncLogMapper.selectCount(todaySuccessWrapper));

        com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ErpSyncLog> todayFailWrapper = baseWrapper.clone();
        todayFailWrapper.between(ErpSyncLog::getCreateTime, todayStart, todayEnd)
                .eq(ErpSyncLog::getSyncStatus, 3);
        stats.setTodayFail(syncLogMapper.selectCount(todayFailWrapper));

        return stats;
    }

    public List<ErpSyncLog> getPendingRetryLogs() {
        return syncLogMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ErpSyncLog>()
                        .eq(ErpSyncLog::getSyncStatus, 3)
                        .lt(ErpSyncLog::getRetryCount, ErpSyncLog::getMaxRetryCount)
                        .le(ErpSyncLog::getNextRetryTime, LocalDateTime.now())
                        .orderByAsc(ErpSyncLog::getNextRetryTime)
                        .last("LIMIT 100")
        );
    }

    public boolean resetLogForRetry(Long logId) {
        ErpSyncLog syncLog = syncLogMapper.selectById(logId);
        if (syncLog == null) {
            return false;
        }
        ErpSyncLog update = new ErpSyncLog();
        update.setId(logId);
        update.setSyncStatus(0);
        update.setSyncType("RETRY");
        update.setErrorMessage(null);
        update.setErrorCode(null);
        update.setNextRetryTime(null);
        syncLogMapper.updateById(update);
        broadcastUpdate();
        return true;
    }

    @Async
    public void asyncResetForRetry(Long logId) {
        resetLogForRetry(logId);
    }

    private void broadcastUpdate() {
        try {
            webSocketService.broadcastErpSyncUpdate("ERP同步状态已更新");
        } catch (Exception e) {
            log.warn("广播ERP同步更新失败: {}", e.getMessage());
        }
    }
}
