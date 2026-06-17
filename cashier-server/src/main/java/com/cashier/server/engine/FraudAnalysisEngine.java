package com.cashier.server.engine;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.cashier.server.entity.fraud.OperationLockLog;
import com.cashier.server.entity.fraud.SuspiciousStore;
import com.cashier.server.service.fraud.FraudAlertService;
import com.cashier.server.service.fraud.OperationLockLogService;
import com.cashier.server.service.fraud.SuspiciousStoreService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Component
public class FraudAnalysisEngine {

    private static final Logger log = LoggerFactory.getLogger(FraudAnalysisEngine.class);

    @Autowired
    private OperationLockLogService operationLockLogService;

    @Autowired
    private SuspiciousStoreService suspiciousStoreService;

    @Autowired
    private FraudAlertService fraudAlertService;

    @Scheduled(cron = "0 0 2 * * ?")
    public void analyzeAllStores() {
        log.info("开始执行全店AI反欺诈分析...");
        try {
            LocalDateTime days30Ago = LocalDateTime.now().minusDays(30);

            List<OperationLockLog> allLogs = operationLockLogService.list(
                    new LambdaQueryWrapper<OperationLockLog>()
                            .ge(OperationLockLog::getCreateTime, days30Ago)
                            .orderByDesc(OperationLockLog::getCreateTime)
            );

            if (allLogs.isEmpty()) {
                log.info("近30天无异常操作记录，跳过分析");
                return;
            }

            Map<Long, List<OperationLockLog>> logsByStore = allLogs.stream()
                    .filter(l -> l.getStoreId() != null)
                    .collect(Collectors.groupingBy(OperationLockLog::getStoreId));

            int suspiciousCount = 0;
            int highRiskCount = 0;
            int criticalCount = 0;

            for (Map.Entry<Long, List<OperationLockLog>> entry : logsByStore.entrySet()) {
                Long storeId = entry.getKey();
                try {
                    Map<String, Object> result = analyzeStore(storeId, entry.getValue());
                    String riskLevel = (String) result.get("riskLevel");
                    boolean isSuspicious = (Boolean) result.get("isSuspicious");

                    if (isSuspicious) {
                        suspiciousCount++;
                        if ("HIGH".equals(riskLevel)) {
                            highRiskCount++;
                        } else if ("CRITICAL".equals(riskLevel)) {
                            criticalCount++;
                        }
                    }
                } catch (Exception e) {
                    log.error("分析门店[{}]失败:", storeId, e);
                }
            }

            log.info("全店反欺诈分析完成，共分析{}家门店，标记可疑门店{}家，高风险{}家，极高风险{}家",
                    logsByStore.size(), suspiciousCount, highRiskCount, criticalCount);

        } catch (Exception e) {
            log.error("全店反欺诈分析异常:", e);
        }
    }

    public Map<String, Object> analyzeStore(Long storeId, List<OperationLockLog> storeLogs) {
        Map<String, Object> result = new HashMap<>();

        if (storeLogs == null || storeLogs.isEmpty()) {
            result.put("riskScore", 0);
            result.put("riskLevel", "LOW");
            result.put("isSuspicious", false);
            return result;
        }

        LocalDateTime days7Ago = LocalDateTime.now().minusDays(7);
        LocalDateTime days30Ago = LocalDateTime.now().minusDays(30);

        List<OperationLockLog> recentLogs = storeLogs.stream()
                .filter(l -> l.getCreateTime() != null && l.getCreateTime().isAfter(days30Ago))
                .collect(Collectors.toList());

        if (recentLogs.isEmpty()) {
            result.put("riskScore", 0);
            result.put("riskLevel", "LOW");
            result.put("isSuspicious", false);
            return result;
        }

        long refundLockCount = recentLogs.stream()
                .filter(l -> "REFUND".equals(l.getOperationType()))
                .count();

        long discountLockCount = recentLogs.stream()
                .filter(l -> "DISCOUNT".equals(l.getOperationType()))
                .count();

        long highRiskCount = recentLogs.stream()
                .filter(l -> l.getRiskLevel() != null && l.getRiskLevel() >= 3)
                .count();

        long criticalCount = recentLogs.stream()
                .filter(l -> l.getRiskLevel() != null && l.getRiskLevel() >= 4)
                .count();

        long offlineCount = recentLogs.stream()
                .filter(l -> l.getIsOffline() != null && l.getIsOffline() == 1)
                .count();

        long last7DaysCount = recentLogs.stream()
                .filter(l -> l.getCreateTime() != null && l.getCreateTime().isAfter(days7Ago))
                .count();

        long pendingCount = recentLogs.stream()
                .filter(l -> l.getVerifyStatus() != null && l.getVerifyStatus() == 0)
                .count();

        long failedCount = recentLogs.stream()
                .filter(l -> l.getVerifyStatus() != null && l.getVerifyStatus() == 2)
                .count();

        long uniqueDays = recentLogs.stream()
                .filter(l -> l.getCreateTime() != null)
                .map(l -> l.getCreateTime().toLocalDate())
                .distinct()
                .count();

        double dailyAverage = uniqueDays > 0 ? (double) recentLogs.size() / uniqueDays : 0;

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

        if (dailyAverage > 2) {
            riskScore += (int) ((dailyAverage - 2) * 10);
        }

        if (uniqueDays >= 7 && dailyAverage >= 1) {
            riskScore += 15;
        }

        long refundFreq7Days = recentLogs.stream()
                .filter(l -> "REFUND".equals(l.getOperationType())
                        && l.getCreateTime() != null && l.getCreateTime().isAfter(days7Ago))
                .count();
        if (refundFreq7Days >= 10) {
            riskScore += 20;
        }

        long discountFreq7Days = recentLogs.stream()
                .filter(l -> "DISCOUNT".equals(l.getOperationType())
                        && l.getCreateTime() != null && l.getCreateTime().isAfter(days7Ago))
                .count();
        if (discountFreq7Days >= 15) {
            riskScore += 15;
        }

        String riskLevel;
        boolean isSuspicious = false;

        if (riskScore >= 150) {
            riskLevel = "CRITICAL";
            isSuspicious = true;
        } else if (riskScore >= 100) {
            riskLevel = "HIGH";
            isSuspicious = true;
        } else if (riskScore >= 50) {
            riskLevel = "MEDIUM";
            isSuspicious = true;
        } else if (riskScore >= 25) {
            riskLevel = "LOW";
        } else {
            riskLevel = "LOW";
        }

        result.put("riskScore", riskScore);
        result.put("riskLevel", riskLevel);
        result.put("isSuspicious", isSuspicious);

        Map<String, Object> breakdown = new HashMap<>();
        breakdown.put("totalLockCount", recentLogs.size());
        breakdown.put("refundLockCount", refundLockCount);
        breakdown.put("discountLockCount", discountLockCount);
        breakdown.put("highRiskCount", highRiskCount);
        breakdown.put("criticalCount", criticalCount);
        breakdown.put("offlineCount", offlineCount);
        breakdown.put("last7DaysCount", last7DaysCount);
        breakdown.put("pendingCount", pendingCount);
        breakdown.put("failedCount", failedCount);
        breakdown.put("uniqueDays", uniqueDays);
        breakdown.put("dailyAverage", String.format("%.2f", dailyAverage));
        breakdown.put("refundFreq7Days", refundFreq7Days);
        breakdown.put("discountFreq7Days", discountFreq7Days);
        result.put("breakdown", breakdown);

        if (isSuspicious) {
            String storeName = recentLogs.get(0).getStoreName();
            suspiciousStoreService.createOrUpdateSuspiciousStore(storeId, storeName, riskScore, riskLevel);

            if (riskScore >= 100 || last7DaysCount >= 7 || criticalCount >= 2) {
                try {
                    String alertTitle = "门店风险等级升高预警";
                    String alertContent = String.format("门店[%s]风险评分达到%d，风险等级[%s]，近30天触发%d次异常锁定，近7天触发%d次",
                            storeName, riskScore, riskLevel, recentLogs.size(), last7DaysCount);

                    fraudAlertService.createAlert(
                            "STORE_RISK_WARNING",
                            riskScore >= 150 ? 4 : (riskScore >= 100 ? 3 : 2),
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

    public Map<String, Object> getFraudOverview() {
        Map<String, Object> overview = new HashMap<>();

        LocalDateTime today = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        LocalDateTime days7Ago = LocalDateTime.now().minusDays(7);
        LocalDateTime days30Ago = LocalDateTime.now().minusDays(30);

        long todayCount = operationLockLogService.count(
                new LambdaQueryWrapper<OperationLockLog>()
                        .ge(OperationLockLog::getCreateTime, today)
        );

        long last7DaysCount = operationLockLogService.count(
                new LambdaQueryWrapper<OperationLockLog>()
                        .ge(OperationLockLog::getCreateTime, days7Ago)
        );

        long last30DaysCount = operationLockLogService.count(
                new LambdaQueryWrapper<OperationLockLog>()
                        .ge(OperationLockLog::getCreateTime, days30Ago)
        );

        long pendingCount = operationLockLogService.count(
                new LambdaQueryWrapper<OperationLockLog>()
                        .eq(OperationLockLog::getVerifyStatus, 0)
        );

        long todayRefundCount = operationLockLogService.count(
                new LambdaQueryWrapper<OperationLockLog>()
                        .ge(OperationLockLog::getCreateTime, today)
                        .eq(OperationLockLog::getOperationType, "REFUND")
        );

        long todayDiscountCount = operationLockLogService.count(
                new LambdaQueryWrapper<OperationLockLog>()
                        .ge(OperationLockLog::getCreateTime, today)
                        .eq(OperationLockLog::getOperationType, "DISCOUNT")
        );

        long suspiciousStoreCount = suspiciousStoreService.count(
                new LambdaQueryWrapper<SuspiciousStore>()
                        .eq(SuspiciousStore::getStatus, "PENDING")
        );

        long highRiskStoreCount = suspiciousStoreService.count(
                new LambdaQueryWrapper<SuspiciousStore>()
                        .in(SuspiciousStore::getRiskLevel, "HIGH", "CRITICAL")
                        .eq(SuspiciousStore::getStatus, "PENDING")
        );

        int newAlertCount = fraudAlertService.getNewAlertCount();

        overview.put("todayLockCount", todayCount);
        overview.put("todayRefundCount", todayRefundCount);
        overview.put("todayDiscountCount", todayDiscountCount);
        overview.put("last7DaysCount", last7DaysCount);
        overview.put("last30DaysCount", last30DaysCount);
        overview.put("pendingCount", pendingCount);
        overview.put("suspiciousStoreCount", suspiciousStoreCount);
        overview.put("highRiskStoreCount", highRiskStoreCount);
        overview.put("newAlertCount", newAlertCount);

        List<Map<String, Object>> trendData = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDateTime dayStart = LocalDateTime.now().minusDays(i).withHour(0).withMinute(0).withSecond(0);
            LocalDateTime dayEnd = dayStart.plusDays(1);

            long dayCount = operationLockLogService.count(
                    new LambdaQueryWrapper<OperationLockLog>()
                            .ge(OperationLockLog::getCreateTime, dayStart)
                            .lt(OperationLockLog::getCreateTime, dayEnd)
            );

            long dayRefundCount = operationLockLogService.count(
                    new LambdaQueryWrapper<OperationLockLog>()
                            .ge(OperationLockLog::getCreateTime, dayStart)
                            .lt(OperationLockLog::getCreateTime, dayEnd)
                            .eq(OperationLockLog::getOperationType, "REFUND")
            );

            long dayDiscountCount = operationLockLogService.count(
                    new LambdaQueryWrapper<OperationLockLog>()
                            .ge(OperationLockLog::getCreateTime, dayStart)
                            .lt(OperationLockLog::getCreateTime, dayEnd)
                            .eq(OperationLockLog::getOperationType, "DISCOUNT")
            );

            Map<String, Object> dayData = new HashMap<>();
            dayData.put("date", dayStart.toLocalDate().toString());
            dayData.put("totalCount", dayCount);
            dayData.put("refundCount", dayRefundCount);
            dayData.put("discountCount", dayDiscountCount);
            trendData.add(dayData);
        }
        overview.put("trendData", trendData);

        List<SuspiciousStore> highRiskStores = suspiciousStoreService.getHighRiskStores();
        overview.put("highRiskStores", highRiskStores.stream().limit(5).collect(Collectors.toList()));

        return overview;
    }
}
