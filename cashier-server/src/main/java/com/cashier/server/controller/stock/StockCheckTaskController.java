package com.cashier.server.controller.stock;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.BusinessException;
import com.cashier.server.common.Result;
import com.cashier.server.dto.stock.StockCheckTaskDTO;
import com.cashier.server.dto.stock.StockCheckUploadDTO;
import com.cashier.server.entity.stock.StockCheckTask;
import com.cashier.server.service.stock.StockCheckTaskService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/stock/check/task")
public class StockCheckTaskController {

    @Autowired
    private StockCheckTaskService stockCheckTaskService;

    @PostMapping
    public Result<StockCheckTask> create(@RequestBody StockCheckTaskDTO dto) {
        log.info("创建盘点任务，taskName={}", dto.getTaskName());
        try {
            StockCheckTask task = stockCheckTaskService.createTask(dto);
            return Result.success(task);
        } catch (BusinessException e) {
            log.error("创建盘点任务失败，taskName={}", dto.getTaskName(), e);
            return Result.fail(e.getMessage());
        } catch (Exception e) {
            log.error("创建盘点任务系统异常，taskName={}", dto.getTaskName(), e);
            return Result.fail("创建盘点任务失败: " + e.getMessage());
        }
    }

    @PutMapping
    public Result<Void> update(@RequestBody StockCheckTaskDTO dto) {
        log.info("更新盘点任务，taskId={}", dto.getId());
        try {
            boolean success = stockCheckTaskService.updateTask(dto);
            return success ? Result.success() : Result.fail("更新失败");
        } catch (BusinessException e) {
            log.error("更新盘点任务失败，taskId={}", dto.getId(), e);
            return Result.fail(e.getMessage());
        } catch (Exception e) {
            log.error("更新盘点任务系统异常，taskId={}", dto.getId(), e);
            return Result.fail("更新盘点任务失败: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        log.info("删除盘点任务，taskId={}", id);
        try {
            boolean success = stockCheckTaskService.deleteTask(id);
            return success ? Result.success() : Result.fail("删除失败");
        } catch (BusinessException e) {
            log.error("删除盘点任务失败，taskId={}", id, e);
            return Result.fail(e.getMessage());
        } catch (Exception e) {
            log.error("删除盘点任务系统异常，taskId={}", id, e);
            return Result.fail("删除盘点任务失败: " + e.getMessage());
        }
    }

    @GetMapping("/list")
    public Result<IPage<StockCheckTask>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) Integer taskType,
            @RequestParam(required = false) Integer checkMode,
            @RequestParam(required = false) Integer taskStatus,
            @RequestParam(required = false) String keyword) {
        log.info("分页查询盘点任务列表，taskType={}, checkMode={}, taskStatus={}", taskType, checkMode, taskStatus);
        try {
            IPage<StockCheckTask> result = stockCheckTaskService.getTaskPage(page, size, taskType, checkMode, taskStatus, keyword);
            return Result.success(result);
        } catch (Exception e) {
            log.error("分页查询盘点任务列表失败", e);
            return Result.fail("查询盘点任务列表失败: " + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public Result<StockCheckTaskDTO> detail(@PathVariable Long id) {
        log.info("查询盘点任务详情，taskId={}", id);
        try {
            StockCheckTaskDTO result = stockCheckTaskService.getTaskDetail(id);
            return Result.success(result);
        } catch (BusinessException e) {
            log.error("查询盘点任务详情失败，taskId={}", id, e);
            return Result.fail(e.getMessage());
        } catch (Exception e) {
            log.error("查询盘点任务详情系统异常，taskId={}", id, e);
            return Result.fail("查询盘点任务详情失败: " + e.getMessage());
        }
    }

    @GetMapping("/download/list")
    public Result<List<StockCheckTask>> downloadList(
            @RequestParam(required = false) Long shopId,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime lastSyncTime) {
        log.info("获取可下载的盘点任务列表，shopId={}, lastSyncTime={}", shopId, lastSyncTime);
        try {
            List<StockCheckTask> result = stockCheckTaskService.getDownloadableTasks(shopId, lastSyncTime);
            return Result.success(result);
        } catch (Exception e) {
            log.error("获取可下载的盘点任务列表失败", e);
            return Result.fail("获取盘点任务列表失败: " + e.getMessage());
        }
    }

    @GetMapping("/{id}/download")
    public Result<StockCheckTaskDTO> download(@PathVariable Long id) {
        log.info("下载盘点任务（含明细），taskId={}", id);
        try {
            StockCheckTaskDTO result = stockCheckTaskService.getTaskWithItems(id);
            return Result.success(result);
        } catch (BusinessException e) {
            log.error("下载盘点任务失败，taskId={}", id, e);
            return Result.fail(e.getMessage());
        } catch (Exception e) {
            log.error("下载盘点任务系统异常，taskId={}", id, e);
            return Result.fail("下载盘点任务失败: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/start")
    public Result<Void> start(
            @PathVariable Long id,
            @RequestBody Map<String, Object> params) {
        Long operatorId = Long.valueOf(params.get("operatorId").toString());
        String operatorName = params.get("operatorName").toString();
        log.info("开始盘点任务，taskId={}, operatorId={}", id, operatorId);
        try {
            boolean success = stockCheckTaskService.startTask(id, operatorId, operatorName);
            return success ? Result.success() : Result.fail("开始失败");
        } catch (BusinessException e) {
            log.error("开始盘点任务失败，taskId={}", id, e);
            return Result.fail(e.getMessage());
        } catch (Exception e) {
            log.error("开始盘点任务系统异常，taskId={}", id, e);
            return Result.fail("开始盘点任务失败: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/finish")
    public Result<Void> finish(@PathVariable Long id) {
        log.info("完成盘点任务，taskId={}", id);
        try {
            boolean success = stockCheckTaskService.finishTask(id);
            return success ? Result.success() : Result.fail("完成失败");
        } catch (BusinessException e) {
            log.error("完成盘点任务失败，taskId={}", id, e);
            return Result.fail(e.getMessage());
        } catch (Exception e) {
            log.error("完成盘点任务系统异常，taskId={}", id, e);
            return Result.fail("完成盘点任务失败: " + e.getMessage());
        }
    }

    @PostMapping("/upload")
    public Result<Map<String, Object>> upload(@RequestBody StockCheckUploadDTO dto) {
        log.info("上传盘点数据，taskId={}", dto.getTaskId());
        try {
            boolean success = stockCheckTaskService.uploadCheckData(dto);
            return Result.success(Map.of("success", success));
        } catch (BusinessException e) {
            log.error("上传盘点数据失败，taskId={}", dto.getTaskId(), e);
            return Result.fail(e.getMessage());
        } catch (Exception e) {
            log.error("上传盘点数据系统异常，taskId={}", dto.getTaskId(), e);
            return Result.fail("上传盘点数据失败: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/calculate-diff")
    public Result<Void> calculateDiff(@PathVariable Long id) {
        log.info("计算盘点差异，taskId={}", id);
        try {
            boolean success = stockCheckTaskService.calculateDiff(id);
            return success ? Result.success() : Result.fail("计算差异失败");
        } catch (BusinessException e) {
            log.error("计算盘点差异失败，taskId={}", id, e);
            return Result.fail(e.getMessage());
        } catch (Exception e) {
            log.error("计算盘点差异系统异常，taskId={}", id, e);
            return Result.fail("计算盘点差异失败: " + e.getMessage());
        }
    }

    @PostMapping("/diff/{diffId}/generate-adjust")
    public Result<Map<String, Object>> generateAdjust(
            @PathVariable Long diffId,
            @RequestParam Integer handleType) {
        log.info("生成库存调整单，diffId={}, handleType={}", diffId, handleType);
        try {
            boolean success = stockCheckTaskService.generateStockAdjust(diffId, handleType);
            return Result.success(Map.of("success", success));
        } catch (BusinessException e) {
            log.error("生成库存调整单失败，diffId={}", diffId, e);
            return Result.fail(e.getMessage());
        } catch (Exception e) {
            log.error("生成库存调整单系统异常，diffId={}", diffId, e);
            return Result.fail("生成库存调整单失败: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/sync-erp")
    public Result<Map<String, Object>> syncTaskToErp(@PathVariable Long id) {
        log.info("同步盘点任务到ERP，taskId={}", id);
        try {
            boolean success = stockCheckTaskService.syncTaskToErp(id);
            return Result.success(Map.of("success", success));
        } catch (BusinessException e) {
            log.error("同步盘点任务到ERP失败，taskId={}", id, e);
            return Result.fail(e.getMessage());
        } catch (Exception e) {
            log.error("同步盘点任务到ERP系统异常，taskId={}", id, e);
            return Result.fail("同步盘点任务到ERP失败: " + e.getMessage());
        }
    }

    @PostMapping("/diff/{diffId}/sync-erp")
    public Result<Map<String, Object>> syncDiffToErp(@PathVariable Long diffId) {
        log.info("同步盘点差异到ERP，diffId={}", diffId);
        try {
            boolean success = stockCheckTaskService.syncDiffToErp(diffId);
            return Result.success(Map.of("success", success));
        } catch (BusinessException e) {
            log.error("同步盘点差异到ERP失败，diffId={}", diffId, e);
            return Result.fail(e.getMessage());
        } catch (Exception e) {
            log.error("同步盘点差异到ERP系统异常，diffId={}", diffId, e);
            return Result.fail("同步盘点差异到ERP失败: " + e.getMessage());
        }
    }
}
