package com.cashier.server.service.order;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.order.Order;
import com.cashier.server.entity.order.OrderItem;
import com.cashier.server.entity.order.OrderPayment;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public interface OrderService extends IService<Order> {

    IPage<Order> getOrderList(Integer page, Integer size, Integer orderStatus, Integer payStatus, Integer syncStatus, String keyword);

    Order getOrderDetail(Long id);

    Order getOrderByOrderNo(String orderNo);

    List<OrderItem> getOrderItems(Long orderId);

    List<OrderPayment> getOrderPayments(Long orderId);

    Order createOrder(List<OrderItem> items, Long cashierId, String cashierName, String remark);

    boolean pay(Long orderId, String payType, BigDecimal payAmount, String transactionId);

    boolean updateSyncStatus(Long orderId, Integer syncStatus, String errorMessage);

    boolean incrementSyncAttempts(Long orderId);

    List<Order> getUnsyncedOrders(Integer maxRetry, Integer limit);

    boolean retrySync(Long orderId);

    Map<String, Object> batchCreateOrders(List<Map<String, Object>> orderList);
}
