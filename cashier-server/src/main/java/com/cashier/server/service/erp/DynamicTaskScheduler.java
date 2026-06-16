package com.cashier.server.service.erp;

import cn.hutool.core.util.StrUtil;
import com.cashier.server.common.BusinessException;
import com.cashier.server.entity.erp.ErpSyncTask;
import com.cashier.server.mapper.erp.ErpSyncTaskMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronTrigger;
import org.springframework.scheduling.support.PeriodicTrigger;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

@Component
public class DynamicTaskScheduler {

    private static final Logger log = LoggerFactory.getLogger(DynamicTaskScheduler.class);

    @Autowired
    private TaskScheduler taskScheduler;

    @Autowired
    private ErpSyncTaskMapper syncTaskMapper;

    @Autowired
    @Lazy
    private ErpSyncService erpSyncService;

    @Autowired
    private ErpSyncLogService syncLogService;

    private final Map<Long, ScheduledFuture<?>> scheduledTasks = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        log.info("开始初始化动态调度任务...");
        List<ErpSyncTask> tasks = syncTaskMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ErpSyncTask>()
                        .eq(ErpSyncTask::getEnabled, 1)
                        .eq(ErpSyncTask::getStatus, 1)
        );
        for (ErpSyncTask task : tasks) {
            scheduleTask(task);
        }
        log.info("动态调度任务初始化完成, 共{}个任务", tasks.size());
    }

    @PreDestroy
    public void destroy() {
        log.info("关闭动态调度任务...");
        for (Map.Entry<Long, ScheduledFuture<?>> entry : scheduledTasks.entrySet()) {
            try {
                entry.getValue().cancel(false);
            } catch (Exception e) {
                log.warn("关闭任务失败: taskId={}", entry.getKey());
            }
        }
        scheduledTasks.clear();
    }

    public void scheduleTask(ErpSyncTask task) {
        if (task == null || task.getId() == null) {
            return;
        }
        cancelTask(task.getId());

        Runnable runnable = () -> executeTask(task);
        ScheduledFuture<?> future;

        try {
            if (StrUtil.isNotBlank(task.getCronExpression())) {
                future = taskScheduler.schedule(runnable, new CronTrigger(task.getCronExpression()));
                log.info("已调度Cron任务: taskCode={}, cron={}", task.getTaskCode(), task.getCronExpression());
            } else if (task.getExecuteInterval() != null && task.getExecuteInterval() > 0) {
                future = taskScheduler.schedule(runnable,
                        new PeriodicTrigger(task.getExecuteInterval(), TimeUnit.SECONDS));
                log.info("已调度间隔任务: taskCode={}, interval={}s", task.getTaskCode(), task.getExecuteInterval());
            } else {
                log.warn("任务没有有效的调度配置: taskCode={}", task.getTaskCode());
                return;
            }
            scheduledTasks.put(task.getId(), future);
        } catch (Exception e) {
            log.error("调度任务失败: taskCode={}, error={}", task.getTaskCode(), e.getMessage());
        }
    }

    public void cancelTask(Long taskId) {
        if (taskId == null) {
            return;
        }
        ScheduledFuture<?> future = scheduledTasks.remove(taskId);
        if (future != null) {
            future.cancel(false);
            log.info("已取消调度任务: taskId={}", taskId);
        }
    }

    public void refreshTask(Long taskId) {
        if (taskId == null) {
            return;
        }
        ErpSyncTask task = syncTaskMapper.selectById(taskId);
        if (task == null) {
            cancelTask(taskId);
            return;
        }
        if (task.getEnabled() == 1 && task.getStatus() == 1) {
            scheduleTask(task);
        } else {
            cancelTask(taskId);
        }
    }

    public void refreshAllTasks() {
        destroy();
        init();
    }

    private void executeTask(ErpSyncTask task) {
        log.info("开始执行同步任务: taskCode={}, taskName={}", task.getTaskCode(), task.getTaskName());
        long startTime = System.currentTimeMillis();
        ErpSyncTask updateTask = new ErpSyncTask();
        updateTask.setId(task.getId());
        updateTask.setLastExecuteTime(LocalDateTime.now());

        try {
            boolean success = executeBusinessSync(task);
            long cost = (int) (System.currentTimeMillis() - startTime);
            updateTask.setLastExecuteStatus(success ? 1 : 2);
            updateTask.setLastExecuteResult(success ? "执行成功，耗时" + cost + "ms" : "执行失败");
            log.info("同步任务执行完成: taskCode={}, 成功={}, 耗时={}ms", task.getTaskCode(), success, cost);
        } catch (Exception e) {
            updateTask.setLastExecuteStatus(2);
            updateTask.setLastExecuteResult("执行异常: " + e.getMessage());
            log.error("同步任务执行异常: taskCode={}, error={}", task.getTaskCode(), e.getMessage(), e);
        }
        syncTaskMapper.updateById(updateTask);
    }

    private boolean executeBusinessSync(ErpSyncTask task) {
        if (task == null || StrUtil.isBlank(task.getBusinessType())) {
            return false;
        }
        try {
            switch (task.getBusinessType()) {
                case "PRODUCT_LIST":
                    erpSyncService.syncProductsFromErp();
                    return true;
                case "STOCK_LIST":
                    erpSyncService.syncStockFromErp();
                    return true;
                case "ORDER_CREATE":
                    return erpSyncService.syncOrdersToErp();
                case "MEMBER_LIST":
                    erpSyncService.syncMembersFromErp();
                    return true;
                case "STOCK_CHECK_TASK_LIST":
                    erpSyncService.syncStockCheckTasksFromErp();
                    return true;
                case "RETRY":
                    return executeRetryFailed();
                default:
                    log.warn("未知的业务类型: businessType={}", task.getBusinessType());
                    return false;
            }
        } catch (Exception e) {
            log.error("业务同步执行失败: businessType={}, error={}", task.getBusinessType(), e.getMessage());
            return false;
        }
    }

    private boolean executeRetryFailed() {
        List<com.cashier.server.entity.erp.ErpSyncLog> failedLogs = syncLogService.getPendingRetryLogs();
        if (failedLogs == null || failedLogs.isEmpty()) {
            return true;
        }
        log.info("需要重试的同步记录数: {}", failedLogs.size());
        int successCount = 0;
        for (com.cashier.server.entity.erp.ErpSyncLog syncLog : failedLogs) {
            try {
                boolean result = retrySync(syncLog);
                if (result) successCount++;
            } catch (Exception e) {
                log.warn("重试失败: logId={}, error={}", syncLog.getId(), e.getMessage());
            }
        }
        log.info("重试任务完成: 总数={}, 成功={}", failedLogs.size(), successCount);
        return true;
    }

    private boolean retrySync(com.cashier.server.entity.erp.ErpSyncLog syncLog) {
        if (syncLog == null) {
            return false;
        }
        String businessType = syncLog.getBusinessType();
        String businessId = syncLog.getBusinessId();
        if (StrUtil.isBlank(businessId)) {
            return false;
        }
        try {
            if ("ORDER_CREATE".equals(businessType)) {
                return erpSyncService.syncOrderToErp(Long.parseLong(businessId));
            }
            return false;
        } catch (Exception e) {
            throw new BusinessException("重试失败: " + e.getMessage());
        }
    }

    @Scheduled(cron = "0 */5 * * * ?")
    public void checkAndReloadTasks() {
        List<ErpSyncTask> tasks = syncTaskMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ErpSyncTask>()
                        .eq(ErpSyncTask::getStatus, 1)
        );
        for (ErpSyncTask task : tasks) {
            if (task.getEnabled() == 1 && !scheduledTasks.containsKey(task.getId())) {
                scheduleTask(task);
            } else if (task.getEnabled() == 0 && scheduledTasks.containsKey(task.getId())) {
                cancelTask(task.getId());
            }
        }
        log.debug("已检查并重新加载调度任务, 当前任务数: {}", scheduledTasks.size());
    }

    public void executeTaskManually(Long taskId) {
        ErpSyncTask task = syncTaskMapper.selectById(taskId);
        if (task == null) {
            throw new BusinessException("任务不存在");
        }
        new Thread(() -> executeTask(task)).start();
    }
}
