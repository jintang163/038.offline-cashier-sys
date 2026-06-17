package com.cashier.server.service.fraud;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.entity.fraud.OperationLockLog;
import com.cashier.server.entity.fraud.SuspiciousStore;
import com.cashier.server.mapper.fraud.SuspiciousStoreMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SuspiciousStoreServiceImpl extends ServiceImpl<SuspiciousStoreMapper, SuspiciousStore> implements SuspiciousStoreService {

    private static final Logger log = LoggerFactory.getLogger(SuspiciousStoreServiceImpl.class);

    @Autowired
    private OperationLockLogService operationLockLogService;

    @Autowired
    private FraudAlertService fraudAlertService;

    @Override
    public IPage<SuspiciousStore> getSuspiciousStoreList(Integer page, Integer size, String riskLevel, String status) {
        LambdaQueryWrapper<SuspiciousStore> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(riskLevel)) {
            wrapper.eq(SuspiciousStore::getRiskLevel, riskLevel);
        }
        if (StringUtils.hasText(status)) {
            wrapper.eq(SuspiciousStore::getStatus, status);
        }
        wrapper.orderByDesc(SuspiciousStore::getRiskScore);
        return page(new Page<>(page, size), wrapper);
    }

    @Override
    public SuspiciousStore getByStoreId(Long storeId) {
        return getOne(new LambdaQueryWrapper<SuspiciousStore>()
                .eq(SuspiciousStore::getStoreId, storeId));
    }

    @Override
    public boolean createOrUpdateSuspiciousStore(Long storeId, String storeName, Integer riskScore, String riskLevel) {
        SuspiciousStore existing = getByStoreId(storeId);

        SuspiciousStore store;
        if (existing != null) {
            store = existing;
            store.setDetectionCount(store.getDetectionCount() + 1);
            if (riskScore > store.getRiskScore()) {
                store.setRiskScore(riskScore);
                store.setRiskLevel(riskLevel);
            }
        } else {
            store = new SuspiciousStore();
            store.setStoreId(storeId);
            store.setStoreName(storeName);
            store.setRiskScore(riskScore);
            store.setRiskLevel(riskLevel);
            store.setDetectionCount(1);
            store.setStatus("PENDING");
        }
        store.setLastDetectionTime(LocalDateTime.now());

        return saveOrUpdate(store);
    }

    @Override
    public boolean handleSuspiciousStore(Long id, String status, Long handlerId, String handlerName, String handleRemark) {
        SuspiciousStore store = getById(id);
        if (store == null) {
            return false;
        }
        store.setStatus(status);
        store.setHandlerId(handlerId);
        store.setHandlerName(handlerName);
        store.setHandleTime(LocalDateTime.now());
        store.setHandleRemark(handleRemark);
        return updateById(store);
    }

    @Override
    public Map<String, Object> analyzeStoreFraud(Long storeId) {
        Map<String, Object> result = new HashMap<>();

        LocalDateTime days7Ago = LocalDateTime.now().minusDays(7);
        LocalDateTime days30Ago = LocalDateTime.now().minusDays(30);

        List<OperationLockLog> allLogs = operationLockLogService.list(
                new LambdaQueryWrapper<OperationLockLog>()
                        .eq(OperationLockLog::getStoreId, storeId)
                        .ge(OperationLockLog::getCreateTime, days30Ago)
                        .orderByDesc(OperationLockLog::getCreateTime)
        );

        if (allLogs.isEmpty()) {
            result.put("riskScore", 0);
            result.put("riskLevel", "LOW");
            result.put("isSuspicious", false);
            result.put("message", "该门店近30天无异常操作记录");
            return result;
        }

        long refundLockCount = allLogs.stream()
                .filter(l -> "REFUND".equals(l.getOperationType()))
                .count();

        long discountLockCount = allLogs.stream()
                .filter(l -> "DISCOUNT".equals(l.getOperationType()))
                .count();

        long highRiskCount = allLogs.stream()
                .filter(l -> l.getRiskLevel() != null && l.getRiskLevel() >= 3)
                .count();

        long criticalCount = allLogs.stream()
                .filter(l -> l.getRiskLevel() != null && l.getRiskLevel() >= 4)
                .count();

        long offlineCount = allLogs.stream()
                .filter(l -> l.getIsOffline() != null && l.getIsOffline() == 1)
                .count();

        long last7DaysCount = allLogs.stream()
                .filter(l -> l.getCreateTime().isAfter(days7Ago))
                .count();

        long pendingCount = allLogs.stream()
                .filter(l -> l.getVerifyStatus() != null && l.getVerifyStatus() == 0)
                .count();

        long failedCount = allLogs.stream()
                .filter(l -> l.getVerifyStatus() != null && l.getVerifyStatus() == 2)
                .count();

        int riskScore = 0;

        riskScore += refundLockCount * 10;
        riskScore += discountLockCount * 8;

        riskScore += highRiskCount * 15;
        riskScore += criticalCount * 25;

        riskScore += offlineCount * 5;

        if (last7DaysCount > 3) {
            riskScore += (last7DaysCount - 3) * 20;
        }

        riskScore += pendingCount * 12;
        riskScore += failedCount * 15;

        String riskLevel;
        boolean isSuspicious = false;

        if (riskScore >= 100) {
            riskLevel = "CRITICAL";
            isSuspicious = true;
        } else if (riskScore >= 70) {
            riskLevel = "HIGH";
            isSuspicious = true;
        } else if (riskScore >= 40) {
            riskLevel = "MEDIUM";
            isSuspicious = true;
        } else if (riskScore >= 20) {
            riskLevel = "LOW";
        } else {
            riskLevel = "LOW";
        }

        result.put("riskScore", riskScore);
        result.put("riskLevel", riskLevel);
        result.put("isSuspicious", isSuspicious);

        Map<String, Object> breakdown = new HashMap<>();
        breakdown.put("totalLockCount", allLogs.size());
        breakdown.put("refundLockCount", refundLockCount);
        breakdown.put("discountLockCount", discountLockCount);
        breakdown.put("highRiskCount", highRiskCount);
        breakdown.put("criticalCount", criticalCount);
        breakdown.put("offlineCount", offlineCount);
        breakdown.put("last7DaysCount", last7DaysCount);
        breakdown.put("pendingCount", pendingCount);
        breakdown.put("failedCount", failedCount);
        breakdown.put("scoreDetails", calculateScoreDetails(refundLockCount, discountLockCount,
                highRiskCount, criticalCount, offlineCount, last7DaysCount, pendingCount, failedCount));

        result.put("breakdown", breakdown);

        List<Map<String, Object>> recentLogs = new ArrayList<>();
        for (OperationLockLog lockLog : allLogs.stream().limit(10).toList()) {
            Map<String, Object> logMap = new HashMap<>();
            logMap.put("lockNo", lockLog.getLockNo());
            logMap.put("operationType", lockLog.getOperationType());
            logMap.put("riskLevel", lockLog.getRiskLevel());
            logMap.put("triggerRule", lockLog.getTriggerRule());
            logMap.put("lockReason", lockLog.getLockReason());
            logMap.put("isOffline", lockLog.getIsOffline());
            logMap.put("verifyStatus", lockLog.getVerifyStatus());
            logMap.put("createTime", lockLog.getCreateTime());
            recentLogs.add(logMap);
        }
        result.put("recentLogs", recentLogs);

        if (isSuspicious) {
            String storeName = allLogs.get(0).getStoreName();
            createOrUpdateSuspiciousStore(storeId, storeName, riskScore, riskLevel);

            if (riskScore >= 70 || last7DaysCount >= 5) {
                try {
                    String alertTitle = "门店风险等级升高";
                    String alertContent = String.format("门店[%s]风险评分达到%d，风险等级[%s]，近7天触发%d次异常锁定",
                            storeName, riskScore, riskLevel, last7DaysCount);

                    fraudAlertService.createAlert(
                            "STORE_RISK_INCREASE",
                            riskScore >= 100 ? 4 : (riskScore >= 70 ? 3 : 2),
                            alertTitle,
                            alertContent,
                            breakdown,
                            storeId,
                            storeName,
                            null,
                            null
                    );
                } catch (Exception e) {
                    log.warn("创建告警失败:", e);
                }
            }
        }

        return result;
    }

    private List<Map<String, Object>> calculateScoreDetails(long refundLockCount, long discountLockCount,
                                                            long highRiskCount, long criticalCount,
                                                            long offlineCount, long last7DaysCount,
                                                            long pendingCount, long failedCount) {
        List<Map<String, Object>> details = new ArrayList<>();

        addScoreItem(details, "退款锁定", refundLockCount * 10, refundLockCount + "次 × 10分");
        addScoreItem(details, "折扣锁定", discountLockCount * 8, discountLockCount + "次 × 8分");
        addScoreItem(details, "高风险操作", highRiskCount * 15, highRiskCount + "次 × 15分");
        addScoreItem(details, "极高风险操作", criticalCount * 25, criticalCount + "次 × 25分");
        addScoreItem(details, "离线操作", offlineCount * 5, offlineCount + "次 × 5分");

        if (last7DaysCount > 3) {
            addScoreItem(details, "近期高频异常", (last7DaysCount - 3) * 20,
                    "近7天" + last7DaysCount + "次，超出3次部分 × 20分");
        }

        addScoreItem(details, "待验证操作", pendingCount * 12, pendingCount + "次 × 12分");
        addScoreItem(details, "验证失败操作", failedCount * 15, failedCount + "次 × 15分");

        return details;
    }

    private void addScoreItem(List<Map<String, Object>> details, String item, long score, String description) {
        if (score > 0) {
            Map<String, Object> itemMap = new HashMap<>();
            itemMap.put("item", item);
            itemMap.put("score", score);
            itemMap.put("description", description);
            details.add(itemMap);
        }
    }

    @Override
    public List<SuspiciousStore> getHighRiskStores() {
        return list(new LambdaQueryWrapper<SuspiciousStore>()
                .in(SuspiciousStore::getRiskLevel, "HIGH", "CRITICAL")
                .eq(SuspiciousStore::getStatus, "PENDING")
                .orderByDesc(SuspiciousStore::getRiskScore));
    }
}
