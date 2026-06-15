package com.cashier.server.controller.order;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.Result;
import com.cashier.server.entity.order.Order;
import com.cashier.server.entity.order.OrderItem;
import com.cashier.server.entity.order.OrderPayment;
import com.cashier.server.service.order.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/order")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @GetMapping("/list")
    public Result<IPage<Order>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) Integer orderStatus,
            @RequestParam(required = false) Integer payStatus,
            @RequestParam(required = false) Integer syncStatus,
            @RequestParam(required = false) String keyword) {
        return Result.success(orderService.getOrderList(page, size, orderStatus, payStatus, syncStatus, keyword));
    }

    @GetMapping("/{id}")
    public Result<Order> detail(@PathVariable Long id) {
        return Result.success(orderService.getOrderDetail(id));
    }

    @GetMapping("/no/{orderNo}")
    public Result<Order> getByOrderNo(@PathVariable String orderNo) {
        return Result.success(orderService.getOrderByOrderNo(orderNo));
    }

    @GetMapping("/{id}/items")
    public Result<List<OrderItem>> items(@PathVariable Long id) {
        return Result.success(orderService.getOrderItems(id));
    }

    @GetMapping("/{id}/payments")
    public Result<List<OrderPayment>> payments(@PathVariable Long id) {
        return Result.success(orderService.getOrderPayments(id));
    }

    @PostMapping
    public Result<Order> create(@RequestBody Map<String, Object> params) {
        @SuppressWarnings("unchecked")
        List<OrderItem> items = (List<OrderItem>) params.get("items");
        Long cashierId = params.get("cashierId") != null ? Long.valueOf(params.get("cashierId").toString()) : null;
        String cashierName = params.get("cashierName") != null ? params.get("cashierName").toString() : null;
        String remark = params.get("remark") != null ? params.get("remark").toString() : null;
        Order order = orderService.createOrder(items, cashierId, cashierName, remark);
        return Result.success(order);
    }

    @PostMapping("/{id}/pay")
    public Result<Void> pay(
            @PathVariable Long id,
            @RequestParam String payType,
            @RequestParam BigDecimal payAmount,
            @RequestParam(required = false) String transactionId) {
        orderService.pay(id, payType, payAmount, transactionId);
        return Result.success();
    }

    @PutMapping("/{id}/sync-status")
    public Result<Void> updateSyncStatus(
            @PathVariable Long id,
            @RequestParam Integer syncStatus,
            @RequestParam(required = false) String errorMessage) {
        orderService.updateSyncStatus(id, syncStatus, errorMessage);
        return Result.success();
    }

    @PostMapping("/{id}/retry")
    public Result<Void> retry(@PathVariable Long id) {
        orderService.retrySync(id);
        return Result.success();
    }

    @GetMapping("/unsynced")
    public Result<List<Order>> getUnsyncedOrders(
            @RequestParam(defaultValue = "5") Integer maxRetry,
            @RequestParam(defaultValue = "100") Integer limit) {
        return Result.success(orderService.getUnsyncedOrders(maxRetry, limit));
    }

    @PostMapping("/batch-create")
    public Result<Map<String, Object>> batchCreate(@RequestBody List<Map<String, Object>> orderList) {
        Map<String, Object> result = orderService.batchCreateOrders(orderList);
        return Result.success(result);
    }
}
