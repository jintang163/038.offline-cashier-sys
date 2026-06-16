package com.cashier.server.controller.stock;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.Result;
import com.cashier.server.entity.stock.StockCheckDiff;
import com.cashier.server.service.stock.StockCheckDiffService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/stock/check/diff")
public class StockCheckDiffController {

    @Autowired
    private StockCheckDiffService stockCheckDiffService;

    @GetMapping("/list")
    public Result<IPage<StockCheckDiff>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) Long taskId,
            @RequestParam(required = false) Integer diffType,
            @RequestParam(required = false) Integer handleStatus,
            @RequestParam(required = false) String keyword) {
        log.info("分页查询盘点差异列表，taskId={}, diffType={}, handleStatus={}", taskId, diffType, handleStatus);
        try {
            IPage<StockCheckDiff> result = stockCheckDiffService.getDiffPage(page, size, taskId, diffType, handleStatus, keyword);
            return Result.success(result);
        } catch (Exception e) {
            log.error("分页查询盘点差异列表失败", e);
            return Result.fail("查询盘点差异列表失败: " + e.getMessage());
        }
    }

    @GetMapping("/task/{taskId}")
    public Result<List<StockCheckDiff>> getByTaskId(@PathVariable Long taskId) {
        log.info("根据任务ID查询盘点差异，taskId={}", taskId);
        try {
            List<StockCheckDiff> result = stockCheckDiffService.getDiffsByTaskId(taskId);
            return Result.success(result);
        } catch (Exception e) {
            log.error("根据任务ID查询盘点差异失败，taskId={}", taskId, e);
            return Result.fail("查询盘点差异失败: " + e.getMessage());
        }
    }

    @GetMapping("/pending")
    public Result<List<StockCheckDiff>> getPending() {
        log.info("查询待处理的盘点差异");
        try {
            List<StockCheckDiff> result = stockCheckDiffService.getPendingDiffs();
            return Result.success(result);
        } catch (Exception e) {
            log.error("查询待处理的盘点差异失败", e);
            return Result.fail("查询待处理的盘点差异失败: " + e.getMessage());
        }
    }
}
