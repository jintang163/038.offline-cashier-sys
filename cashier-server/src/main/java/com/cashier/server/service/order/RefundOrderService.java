package com.cashier.server.service.order;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.dto.RefundOrderSyncDTO;
import com.cashier.server.entity.order.RefundOrder;
import com.cashier.server.entity.order.RefundOrderItem;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public interface RefundOrderService extends IService<RefundOrder> {

    IPage<RefundOrder> getRefundOrderList(Integer page, Integer size, Integer refundType, Integer auditStatus, Integer syncStatus, String keyword);

    RefundOrder getRefundOrderDetail(Long id);

    List<RefundOrderItem> getRefundOrderItems(Long refundOrderId);

    RefundOrder createRefundOrder(Map<String, Object> params);

    boolean auditRefund(Long refundOrderId, Integer auditStatus, Long auditorId, String auditorName, String auditRemark);

    boolean updateSyncStatus(Long refundOrderId, Integer syncStatus, String errorMessage);

    List<RefundOrder> getUnsyncedRefundOrders(Integer maxRetry, Integer limit);

    Map<String, Object> batchSyncRefundOrders(List<RefundOrderSyncDTO> refundOrderList);

    boolean pushToErp(Long refundOrderId);

    List<RefundOrder> getPendingAuditList(Integer page, Integer size);

    int getTotalRefundedQtyByOrderItemId(Long orderItemId, Long excludeRefundOrderId);

    BigDecimal getTotalRefundedAmountByOrderId(Long orderId, Long excludeRefundOrderId);
}
