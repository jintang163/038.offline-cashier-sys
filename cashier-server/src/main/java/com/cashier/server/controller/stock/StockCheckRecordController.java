package com.cashier.server.controller.stock;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.Result;
import com.cashier.server.entity.stock.StockCheckRecord;
import com.cashier.server.service.stock.StockCheckRecordService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/stock/check/record")
public class StockCheckRecordController {

    @Autowired
    private StockCheckRecordService stockCheckRecordService;

    @GetMapping("/list")
    public Result<IPage<StockCheckRecord>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) Long taskId,
            @RequestParam(required = false) Long itemId,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) String barcode) {
        log.info("分页查询盘点记录列表，taskId={}, itemId={}", taskId, itemId);
        try {
            IPage<StockCheckRecord> result = stockCheckRecordService.getRecordPage(page, size, taskId, itemId, productId, barcode);
            return Result.success(result);
        } catch (Exception e) {
            log.error("分页查询盘点记录列表失败", e);
            return Result.fail("查询盘点记录列表失败: " + e.getMessage());
        }
    }

    @GetMapping("/task/{taskId}")
    public Result<List<StockCheckRecord>> getByTaskId(@PathVariable Long taskId) {
        log.info("根据任务ID查询盘点记录，taskId={}", taskId);
        try {
            List<StockCheckRecord> result = stockCheckRecordService.getRecordsByTaskId(taskId);
            return Result.success(result);
        } catch (Exception e) {
            log.error("根据任务ID查询盘点记录失败，taskId={}", taskId, e);
            return Result.fail("查询盘点记录失败: " + e.getMessage());
        }
    }

    @GetMapping("/item/{itemId}")
    public Result<List<StockCheckRecord>> getByItemId(@PathVariable Long itemId) {
        log.info("根据明细ID查询盘点记录，itemId={}", itemId);
        try {
            List<StockCheckRecord> result = stockCheckRecordService.getRecordsByItemId(itemId);
            return Result.success(result);
        } catch (Exception e) {
            log.error("根据明细ID查询盘点记录失败，itemId={}", itemId, e);
            return Result.fail("查询盘点记录失败: " + e.getMessage());
        }
    }
}
