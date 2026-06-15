package com.cashier.server.controller.erp;

import com.cashier.server.common.Result;
import com.cashier.server.service.erp.ErpSyncService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/erp")
public class ErpPushController {

    @Autowired
    private ErpSyncService erpSyncService;

    @PostMapping("/push/products")
    public Result<Void> pushProducts(@RequestBody List<Map<String, Object>> productList) {
        boolean success = erpSyncService.receiveProductPush(productList);
        return success ? Result.success() : Result.fail("商品推送处理失败");
    }

    @PostMapping("/push/categories")
    public Result<Void> pushCategories(@RequestBody List<Map<String, Object>> categoryList) {
        boolean success = erpSyncService.receiveCategoryPush(categoryList);
        return success ? Result.success() : Result.fail("分类推送处理失败");
    }

    @PostMapping("/push/stock")
    public Result<Void> pushStock(@RequestBody List<Map<String, Object>> stockList) {
        boolean success = erpSyncService.receiveStockPush(stockList);
        return success ? Result.success() : Result.fail("库存推送处理失败");
    }

    @PostMapping("/order/callback")
    public Result<Void> orderCallback(@RequestBody Map<String, Object> callbackData) {
        boolean success = erpSyncService.receiveOrderCallback(callbackData);
        return success ? Result.success() : Result.fail("订单回调处理失败");
    }

    @PostMapping("/sync/products")
    public Result<Void> syncProducts() {
        erpSyncService.syncProductsFromErp();
        return Result.success();
    }

    @PostMapping("/sync/stocks")
    public Result<Void> syncStocks() {
        erpSyncService.syncStockFromErp();
        return Result.success();
    }

    @PostMapping("/sync/orders")
    public Result<Void> syncOrders() {
        boolean success = erpSyncService.syncOrdersToErp();
        return success ? Result.success() : Result.fail("订单同步部分失败");
    }

    @PostMapping("/sync/order/{orderId}")
    public Result<Void> syncOrder(@PathVariable Long orderId) {
        boolean success = erpSyncService.syncOrderToErp(orderId);
        return success ? Result.success() : Result.fail("订单同步失败");
    }
}
