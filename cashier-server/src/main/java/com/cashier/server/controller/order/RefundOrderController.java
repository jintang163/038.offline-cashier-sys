package com.cashier.server.controller.order;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.Result;
import com.cashier.server.dto.RefundOrderSyncDTO;
import com.cashier.server.entity.order.RefundOrder;
import com.cashier.server.entity.order.RefundOrderItem;
import com.cashier.server.service.order.RefundOrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/refund")
public class RefundOrderController {

    @Autowired
    private RefundOrderService refundOrderService;

    @GetMapping("/list")
    public Result<IPage<RefundOrder>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) Integer refundType,
            @RequestParam(required = false) Integer auditStatus,
            @RequestParam(required = false) Integer syncStatus,
            @RequestParam(required = false) String keyword) {
        return Result.success(refundOrderService.getRefundOrderList(page, size, refundType, auditStatus, syncStatus, keyword));
    }

    @GetMapping("/{id}")
    public Result<RefundOrder> detail(@PathVariable Long id) {
        return Result.success(refundOrderService.getRefundOrderDetail(id));
    }

    @GetMapping("/{id}/items")
    public Result<List<RefundOrderItem>> items(@PathVariable Long id) {
        return Result.success(refundOrderService.getRefundOrderItems(id));
    }

    @GetMapping("/pending-audit")
    public Result<List<RefundOrder>> pendingAuditList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(refundOrderService.getPendingAuditList(page, size));
    }

    @PostMapping
    public Result<RefundOrder> create(@RequestBody Map<String, Object> params) {
        RefundOrder refundOrder = refundOrderService.createRefundOrder(params);
        return Result.success(refundOrder);
    }

    @PostMapping("/{id}/audit")
    public Result<Void> audit(
            @PathVariable Long id,
            @RequestBody Map<String, Object> params) {
        Integer auditStatus = params.get("auditStatus") != null ? Integer.valueOf(params.get("auditStatus").toString()) : null;
        Long auditorId = params.get("auditorId") != null ? Long.valueOf(params.get("auditorId").toString()) : null;
        String auditorName = params.get("auditorName") != null ? params.get("auditorName").toString() : null;
        String auditRemark = params.get("auditRemark") != null ? params.get("auditRemark").toString() : null;
        refundOrderService.auditRefund(id, auditStatus, auditorId, auditorName, auditRemark);
        return Result.success();
    }

    @PutMapping("/{id}/sync-status")
    public Result<Void> updateSyncStatus(
            @PathVariable Long id,
            @RequestParam Integer syncStatus,
            @RequestParam(required = false) String errorMessage) {
        refundOrderService.updateSyncStatus(id, syncStatus, errorMessage);
        return Result.success();
    }

    @GetMapping("/unsynced")
    public Result<List<RefundOrder>> getUnsyncedRefundOrders(
            @RequestParam(defaultValue = "5") Integer maxRetry,
            @RequestParam(defaultValue = "100") Integer limit) {
        return Result.success(refundOrderService.getUnsyncedRefundOrders(maxRetry, limit));
    }

    @PostMapping("/batch-sync")
    public Result<Map<String, Object>> batchSync(@RequestBody List<RefundOrderSyncDTO> refundOrderList) {
        Map<String, Object> result = refundOrderService.batchSyncRefundOrders(refundOrderList);
        return Result.success(result);
    }

    @PostMapping("/{id}/push-erp")
    public Result<Void> pushToErp(@PathVariable Long id) {
        refundOrderService.pushToErp(id);
        return Result.success();
    }
}
