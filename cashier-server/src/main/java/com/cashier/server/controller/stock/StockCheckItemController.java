package com.cashier.server.controller.stock;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.Result;
import com.cashier.server.entity.stock.StockCheckItem;
import com.cashier.server.service.stock.StockCheckItemService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/stock/check/item")
public class StockCheckItemController {

    @Autowired
    private StockCheckItemService stockCheckItemService;

    @GetMapping("/list")
    public Result<IPage<StockCheckItem>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) Long taskId,
            @RequestParam(required = false) Integer checkStatus,
            @RequestParam(required = false) String keyword) {
        log.info("分页查询盘点明细列表，taskId={}, checkStatus={}", taskId, checkStatus);
        try {
            IPage<StockCheckItem> result = stockCheckItemService.getItemPage(page, size, taskId, checkStatus, keyword);
            return Result.success(result);
        } catch (Exception e) {
            log.error("分页查询盘点明细列表失败", e);
            return Result.fail("查询盘点明细列表失败: " + e.getMessage());
        }
    }

    @GetMapping("/task/{taskId}")
    public Result<List<StockCheckItem>> getByTaskId(@PathVariable Long taskId) {
        log.info("根据任务ID查询盘点明细，taskId={}", taskId);
        try {
            List<StockCheckItem> result = stockCheckItemService.getItemsByTaskId(taskId);
            return Result.success(result);
        } catch (Exception e) {
            log.error("根据任务ID查询盘点明细失败，taskId={}", taskId, e);
            return Result.fail("查询盘点明细失败: " + e.getMessage());
        }
    }

    @GetMapping("/barcode")
    public Result<StockCheckItem> getByBarcode(
            @RequestParam Long taskId,
            @RequestParam String barcode) {
        log.info("根据条码查询盘点明细，taskId={}, barcode={}", taskId, barcode);
        try {
            StockCheckItem result = stockCheckItemService.getItemByBarcode(taskId, barcode);
            return Result.success(result);
        } catch (Exception e) {
            log.error("根据条码查询盘点明细失败，taskId={}, barcode={}", taskId, barcode, e);
            return Result.fail("查询盘点明细失败: " + e.getMessage());
        }
    }
}
