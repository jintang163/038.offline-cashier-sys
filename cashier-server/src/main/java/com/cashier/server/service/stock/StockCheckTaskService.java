package com.cashier.server.service.stock;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.dto.stock.StockCheckTaskDTO;
import com.cashier.server.dto.stock.StockCheckUploadDTO;
import com.cashier.server.entity.stock.StockCheckTask;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface StockCheckTaskService extends IService<StockCheckTask> {

    StockCheckTask createTask(StockCheckTaskDTO dto);

    boolean updateTask(StockCheckTaskDTO dto);

    boolean deleteTask(Long id);

    IPage<StockCheckTask> getTaskPage(Integer page, Integer size, Integer taskType, Integer checkMode, Integer taskStatus, String keyword);

    StockCheckTaskDTO getTaskDetail(Long id);

    List<StockCheckTask> getDownloadableTasks(Long shopId, LocalDateTime lastSyncTime);

    StockCheckTaskDTO getTaskWithItems(Long id);

    boolean startTask(Long id, Long operatorId, String operatorName);

    boolean finishTask(Long id);

    boolean uploadCheckData(StockCheckUploadDTO dto);

    boolean calculateDiff(Long taskId);

    boolean generateStockAdjust(Long diffId, Integer handleType);

    boolean syncTaskToErp(Long taskId);

    boolean syncDiffToErp(Long diffId);

    boolean syncOrUpdateTaskFromErp(Map<String, Object> taskData);

    boolean syncTaskItemsFromErp(String erpTaskId, List<Map<String, Object>> items);

    Map<String, Object> buildErpCheckResult(Long taskId);

    Map<String, Object> buildErpDiffData(Long diffId);

    Map<String, Object> completeCheckProcess(Long taskId);
}
