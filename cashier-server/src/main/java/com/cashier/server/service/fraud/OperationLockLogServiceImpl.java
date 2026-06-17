package com.cashier.server.service.fraud;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.common.BusinessException;
import com.cashier.server.entity.fraud.OperationLockLog;
import com.cashier.server.mapper.fraud.OperationLockLogMapper;
import com.cashier.server.service.system.SysUserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class OperationLockLogServiceImpl extends ServiceImpl<OperationLockLogMapper, OperationLockLog> implements OperationLockLogService {

    private static final Logger log = LoggerFactory.getLogger(OperationLockLogServiceImpl.class);

    @Autowired
    private SysUserService sysUserService;

    @Autowired
    private FraudAlertService fraudAlertService;

    @Override
    public IPage<OperationLockLog> getLockLogList(Integer page, Integer size, String operationType, Integer riskLevel, Integer verifyStatus, String storeId) {
        LambdaQueryWrapper<OperationLockLog> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(operationType)) {
            wrapper.eq(OperationLockLog::getOperationType, operationType);
        }
        if (riskLevel != null) {
            wrapper.eq(OperationLockLog::getRiskLevel, riskLevel);
        }
        if (verifyStatus != null) {
            wrapper.eq(OperationLockLog::getVerifyStatus, verifyStatus);
        }
        if (StringUtils.hasText(storeId)) {
            wrapper.eq(OperationLockLog::getStoreId, storeId);
        }
        wrapper.orderByDesc(OperationLockLog::getCreateTime);
        return page(new Page<>(page, size), wrapper);
    }

    @Override
    public Map<String, Object> verifyOperationLock(Long lockId, String managerUsername, String managerPassword, String verifyRemark) {
        Map<String, Object> result = new HashMap<>();

        OperationLockLog lockLog = getById(lockId);
        if (lockLog == null) {
            throw new BusinessException("锁定记录不存在");
        }

        if (lockLog.getVerifyStatus() != 0) {
            throw new BusinessException("该锁定记录已处理");
        }

        Map<String, Object> verifyResult = sysUserService.verifyManager(managerUsername, managerPassword);
        if (verifyResult == null || !(Boolean) verifyResult.getOrDefault("success", false)) {
            lockLog.setVerifyStatus(2);
            lockLog.setVerifyRemark("验证失败：" + (verifyResult != null ? verifyResult.get("message") : "账号或密码错误"));
            lockLog.setVerifyTime(LocalDateTime.now());
            updateById(lockLog);

            result.put("success", false);
            result.put("message", verifyResult != null ? verifyResult.get("message") : "管理员验证失败");
            return result;
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> managerInfo = (Map<String, Object>) verifyResult.get("data");

        lockLog.setVerifyStatus(1);
        lockLog.setVerifyUserId(((Number) managerInfo.get("userId")).longValue());
        lockLog.setVerifyUserName((String) managerInfo.get("username"));
        lockLog.setVerifyRemark(verifyRemark);
        lockLog.setVerifyTime(LocalDateTime.now());
        updateById(lockLog);

        result.put("success", true);
        result.put("message", "验证通过");
        result.put("data", managerInfo);

        try {
            String alertTitle = "操作锁定已验证通过";
            String alertContent = String.format("门店[%s]的操作锁定已由管理员[%s]验证通过，原因：%s",
                    lockLog.getStoreName(),
                    lockLog.getVerifyUserName(),
                    lockLog.getLockReason());
            Map<String, Object> alertDetails = new HashMap<>();
            alertDetails.put("lockId", lockId);
            alertDetails.put("lockNo", lockLog.getLockNo());
            alertDetails.put("operationType", lockLog.getOperationType());
            alertDetails.put("triggerRule", lockLog.getTriggerRule());

            fraudAlertService.createAlert(
                    "OPERATION_VERIFIED",
                    lockLog.getRiskLevel(),
                    alertTitle,
                    alertContent,
                    alertDetails,
                    lockLog.getStoreId(),
                    lockLog.getStoreName(),
                    lockLog.getDeviceId(),
                    lockLog.getDeviceNo()
            );
        } catch (Exception e) {
            log.warn("创建告警失败:", e);
        }

        return result;
    }

    @Override
    public Map<String, Object> verifyOperationLockByLockNo(String lockNo, String managerUsername, String managerPassword, String verifyRemark) {
        OperationLockLog lockLog = getOne(new LambdaQueryWrapper<OperationLockLog>()
                .eq(OperationLockLog::getLockNo, lockNo));

        if (lockLog == null) {
            Map<String, Object> result = new HashMap<>();
            result.put("success", false);
            result.put("message", "锁定记录不存在，请稍后重试");
            return result;
        }

        return verifyOperationLock(lockLog.getId(), managerUsername, managerPassword, verifyRemark);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> syncOperationLockLogs(List<OperationLockLog> lockLogs) {
        Map<String, Object> result = new HashMap<>();
        List<Long> syncedIds = new ArrayList<>();
        List<Long> failedIds = new ArrayList<>();

        if (CollectionUtils.isEmpty(lockLogs)) {
            result.put("success", true);
            result.put("synced", 0);
            result.put("failed", 0);
            return result;
        }

        for (OperationLockLog logData : lockLogs) {
            try {
                OperationLockLog existing = getOne(new LambdaQueryWrapper<OperationLockLog>()
                        .eq(OperationLockLog::getLockNo, logData.getLockNo()));

                if (existing == null) {
                    save(logData);
                } else {
                    logData.setId(existing.getId());
                    updateById(logData);
                }
                syncedIds.add(logData.getId() != null ? logData.getId() : existing.getId());

                if (logData.getVerifyStatus() == null || logData.getVerifyStatus() == 0) {
                    try {
                        String alertTitle = "检测到异常操作锁定";
                        String alertContent = String.format("门店[%s]触发异常操作锁定，类型：%s，原因：%s",
                                logData.getStoreName(),
                                logData.getOperationType(),
                                logData.getLockReason());
                        Map<String, Object> alertDetails = new HashMap<>();
                        alertDetails.put("lockNo", logData.getLockNo());
                        alertDetails.put("operationType", logData.getOperationType());
                        alertDetails.put("triggerRule", logData.getTriggerRule());
                        alertDetails.put("riskLevel", logData.getRiskLevel());
                        alertDetails.put("isOffline", logData.getIsOffline());

                        fraudAlertService.createAlert(
                                logData.getOperationType().equals("REFUND") ? "REFUND_AMOUNT" : "ABNORMAL_DISCOUNT",
                                logData.getRiskLevel(),
                                alertTitle,
                                alertContent,
                                alertDetails,
                                logData.getStoreId(),
                                logData.getStoreName(),
                                logData.getDeviceId(),
                                logData.getDeviceNo()
                        );
                    } catch (Exception e) {
                        log.warn("创建告警失败:", e);
                    }
                }
            } catch (Exception e) {
                log.error("同步锁定日志失败, lockNo: {}", logData.getLockNo(), e);
                failedIds.add(logData.getId());
            }
        }

        result.put("success", true);
        result.put("synced", syncedIds.size());
        result.put("failed", failedIds.size());
        result.put("syncedIds", syncedIds);
        result.put("failedIds", failedIds);

        return result;
    }

    @Override
    public boolean updateVerifyStatus(Long lockId, Integer verifyStatus, Long verifyUserId, String verifyUserName, String verifyRemark) {
        OperationLockLog lockLog = getById(lockId);
        if (lockLog == null) {
            return false;
        }
        lockLog.setVerifyStatus(verifyStatus);
        if (verifyUserId != null) {
            lockLog.setVerifyUserId(verifyUserId);
        }
        if (StringUtils.hasText(verifyUserName)) {
            lockLog.setVerifyUserName(verifyUserName);
        }
        if (StringUtils.hasText(verifyRemark)) {
            lockLog.setVerifyRemark(verifyRemark);
        }
        lockLog.setVerifyTime(LocalDateTime.now());
        return updateById(lockLog);
    }

    @Override
    public List<OperationLockLog> getPendingVerifyLogs() {
        return list(new LambdaQueryWrapper<OperationLockLog>()
                .eq(OperationLockLog::getVerifyStatus, 0)
                .orderByDesc(OperationLockLog::getCreateTime));
    }

    @Override
    public Map<String, Object> getLockStatistics() {
        Map<String, Object> stats = new HashMap<>();

        long totalCount = count();
        long pendingCount = count(new LambdaQueryWrapper<OperationLockLog>().eq(OperationLockLog::getVerifyStatus, 0));
        long verifiedCount = count(new LambdaQueryWrapper<OperationLockLog>().eq(OperationLockLog::getVerifyStatus, 1));
        long failedCount = count(new LambdaQueryWrapper<OperationLockLog>().eq(OperationLockLog::getVerifyStatus, 2));
        long offlineCount = count(new LambdaQueryWrapper<OperationLockLog>().eq(OperationLockLog::getIsOffline, 1));

        long refundCount = count(new LambdaQueryWrapper<OperationLockLog>().eq(OperationLockLog::getOperationType, "REFUND"));
        long discountCount = count(new LambdaQueryWrapper<OperationLockLog>().eq(OperationLockLog::getOperationType, "DISCOUNT"));

        stats.put("totalCount", totalCount);
        stats.put("pendingCount", pendingCount);
        stats.put("verifiedCount", verifiedCount);
        stats.put("failedCount", failedCount);
        stats.put("offlineCount", offlineCount);
        stats.put("refundCount", refundCount);
        stats.put("discountCount", discountCount);

        return stats;
    }
}
