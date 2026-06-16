package com.cashier.server.service.order;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.dto.OrderItemSyncDTO;
import com.cashier.server.dto.OrderPaymentSyncDTO;
import com.cashier.server.dto.OrderSyncDTO;
import com.cashier.server.entity.order.Order;
import com.cashier.server.entity.order.OrderItem;
import com.cashier.server.entity.order.OrderPayment;
import com.cashier.server.entity.order.SalesSummary;
import com.cashier.server.mapper.order.OrderMapper;
import com.cashier.server.service.product.ProductStockService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class OrderServiceImpl extends ServiceImpl<OrderMapper, Order> implements OrderService {

    @Autowired
    private OrderItemService orderItemService;

    @Autowired
    private OrderPaymentService orderPaymentService;

    @Autowired
    private ProductStockService productStockService;

    @Autowired
    private SalesSummaryService salesSummaryService;

    @Override
    public IPage<Order> getOrderList(Integer page, Integer size, Integer orderStatus, Integer payStatus, Integer syncStatus, String keyword) {
        LambdaQueryWrapper<Order> wrapper = new LambdaQueryWrapper<>();
        if (orderStatus != null) {
            wrapper.eq(Order::getOrderStatus, orderStatus);
        }
        if (payStatus != null) {
            wrapper.eq(Order::getPayStatus, payStatus);
        }
        if (syncStatus != null) {
            wrapper.eq(Order::getSyncStatus, syncStatus);
        }
        if (StringUtils.hasText(keyword)) {
            wrapper.like(Order::getOrderNo, keyword);
        }
        wrapper.orderByDesc(Order::getCreateTime);
        return page(new Page<>(page, size), wrapper);
    }

    @Override
    public Order getOrderDetail(Long id) {
        return getById(id);
    }

    @Override
    public Order getOrderByOrderNo(String orderNo) {
        return lambdaQuery()
                .eq(Order::getOrderNo, orderNo)
                .one();
    }

    @Override
    public List<OrderItem> getOrderItems(Long orderId) {
        return orderItemService.lambdaQuery()
                .eq(OrderItem::getOrderId, orderId)
                .list();
    }

    @Override
    public List<OrderPayment> getOrderPayments(Long orderId) {
        return orderPaymentService.lambdaQuery()
                .eq(OrderPayment::getOrderId, orderId)
                .list();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Order createOrder(List<OrderItem> items, Long cashierId, String cashierName, String remark) {
        String orderNo = generateOrderNo();

        BigDecimal totalAmount = BigDecimal.ZERO;
        for (OrderItem item : items) {
            totalAmount = totalAmount.add(item.getTotalAmount());
        }

        Order order = new Order();
        order.setOrderNo(orderNo);
        order.setTotalAmount(totalAmount);
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setPayAmount(totalAmount);
        order.setPayStatus(0);
        order.setOrderStatus(1);
        order.setSyncStatus(0);
        order.setSyncAttempts(0);
        order.setCashierId(cashierId);
        order.setCashierName(cashierName);
        order.setRemark(remark);
        save(order);

        for (OrderItem item : items) {
            item.setOrderId(order.getId());
            item.setOrderNo(orderNo);
            orderItemService.save(item);
            productStockService.freezeStock(item.getProductId(), item.getQuantity());
        }

        return order;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean pay(Long orderId, String payType, BigDecimal payAmount, String transactionId,
                       String foreignCurrency, BigDecimal foreignRate, BigDecimal foreignAmount,
                       BigDecimal foreignReceived, BigDecimal foreignChange) {
        Order order = getById(orderId);
        if (order == null || order.getPayStatus() == 1) {
            return false;
        }

        String paymentNo = "PAY" + System.currentTimeMillis();

        OrderPayment payment = new OrderPayment();
        payment.setOrderId(orderId);
        payment.setOrderNo(order.getOrderNo());
        payment.setPaymentNo(paymentNo);
        payment.setPayType(payType);
        payment.setPayAmount(payAmount);
        payment.setForeignCurrency(foreignCurrency);
        payment.setForeignRate(foreignRate);
        payment.setForeignAmount(foreignAmount);
        payment.setForeignReceived(foreignReceived);
        payment.setForeignChange(foreignChange);
        payment.setPayStatus(1);
        payment.setPayTime(LocalDateTime.now());
        payment.setTransactionId(transactionId);
        orderPaymentService.save(payment);

        order.setPayStatus(1);
        order.setOrderStatus(2);
        updateById(order);

        List<OrderItem> items = getOrderItems(orderId);
        for (OrderItem item : items) {
            productStockService.deductStock(item.getProductId(), item.getQuantity());
            productStockService.unfreezeStock(item.getProductId(), item.getQuantity());
        }

        return true;
    }

    @Override
    public boolean updateSyncStatus(Long orderId, Integer syncStatus, String errorMessage) {
        Order order = new Order();
        order.setId(orderId);
        order.setSyncStatus(syncStatus);
        if (errorMessage != null) {
            order.setSyncErrorMessage(errorMessage);
        }
        return updateById(order);
    }

    @Override
    public boolean incrementSyncAttempts(Long orderId) {
        return lambdaUpdate()
                .setSql("sync_attempts = sync_attempts + 1")
                .eq(Order::getId, orderId)
                .update();
    }

    @Override
    public List<Order> getUnsyncedOrders(Integer maxRetry, Integer limit) {
        LambdaQueryWrapper<Order> wrapper = new LambdaQueryWrapper<>();
        wrapper.ne(Order::getSyncStatus, 1);
        wrapper.lt(Order::getSyncAttempts, maxRetry);
        wrapper.orderByAsc(Order::getCreateTime);
        wrapper.last("LIMIT " + limit);
        return list(wrapper);
    }

    @Override
    public boolean retrySync(Long orderId) {
        Order order = getById(orderId);
        if (order == null) {
            return false;
        }
        order.setSyncStatus(0);
        order.setSyncAttempts(0);
        order.setSyncErrorMessage(null);
        return updateById(order);
    }

    private String generateOrderNo() {
        return "ORD" + System.currentTimeMillis() + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
    }

    @Override
    public Map<String, Object> batchCreateOrders(List<Map<String, Object>> orderList) {
        int successCount = 0;
        int failCount = 0;
        List<Map<String, Object>> failOrders = new ArrayList<>();

        for (int i = 0; i < orderList.size(); i++) {
            Map<String, Object> orderData = orderList.get(i);
            try {
                @SuppressWarnings("unchecked")
                List<OrderItem> items = (List<OrderItem>) orderData.get("items");
                Long cashierId = orderData.get("cashierId") != null ? Long.valueOf(orderData.get("cashierId").toString()) : null;
                String cashierName = orderData.get("cashierName") != null ? orderData.get("cashierName").toString() : null;
                String remark = orderData.get("remark") != null ? orderData.get("remark").toString() : null;

                Order order = createOrder(items, cashierId, cashierName, remark);

                @SuppressWarnings("unchecked")
                List<Map<String, Object>> payments = (List<Map<String, Object>>) orderData.get("payments");
                if (payments != null && !payments.isEmpty()) {
                    for (Map<String, Object> paymentData : payments) {
                        String payType = paymentData.get("payType") != null ? paymentData.get("payType").toString() : null;
                        BigDecimal payAmount = paymentData.get("payAmount") != null ? new BigDecimal(paymentData.get("payAmount").toString()) : BigDecimal.ZERO;
                        String transactionId = paymentData.get("transactionId") != null ? paymentData.get("transactionId").toString() : null;
                        pay(order.getId(), payType, payAmount, transactionId);
                    }
                }

                if (orderData.get("orderNo") != null) {
                    String originalOrderNo = orderData.get("orderNo").toString();
                    Order existOrder = lambdaQuery().eq(Order::getOrderNo, originalOrderNo).one();
                    if (existOrder == null) {
                        order.setOrderNo(originalOrderNo);
                        updateById(order);
                    }
                }

                successCount++;
            } catch (Exception e) {
                failCount++;
                Map<String, Object> failInfo = new HashMap<>();
                failInfo.put("index", i);
                failInfo.put("error", e.getMessage());
                failOrders.add(failInfo);
                log.error("批量创建订单失败, index={}, error={}", i, e.getMessage());
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("total", orderList.size());
        result.put("successCount", successCount);
        result.put("failCount", failCount);
        result.put("failOrders", failOrders);
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> batchSyncOrders(List<OrderSyncDTO> orderList) {
        int total = orderList.size();
        int successCount = 0;
        int failCount = 0;
        List<Map<String, Object>> failOrders = new ArrayList<>();

        for (OrderSyncDTO orderDTO : orderList) {
            try {
                String orderNo = orderDTO.getOrderNo();
                Order existOrder = lambdaQuery().eq(Order::getOrderNo, orderNo).one();

                if (existOrder == null) {
                    Order order = createOrderFromDTO(orderDTO);
                    save(order);

                    List<OrderItem> orderItems = convertOrderItems(orderDTO.getItems(), order.getId(), orderNo);
                    orderItemService.saveBatch(orderItems);

                    List<SalesSummary> salesSummaries = convertSalesSummaries(orderDTO.getItems(), orderDTO.getCreatedAt() != null ? orderDTO.getCreatedAt().toLocalDate() : LocalDate.now());
                    salesSummaryService.saveBatch(salesSummaries);

                    if (orderDTO.getPayments() != null && !orderDTO.getPayments().isEmpty()) {
                        for (OrderPaymentSyncDTO paymentDTO : orderDTO.getPayments()) {
                            if (paymentDTO.getPayStatus() != null && paymentDTO.getPayStatus() == 1) {
                                pay(order.getId(), paymentDTO.getPayType(), paymentDTO.getPayAmount(), paymentDTO.getTransactionId());
                            }
                        }
                    }

                    if (orderDTO.getPayStatus() != null && orderDTO.getPayStatus() == 1 && (orderDTO.getPayments() == null || orderDTO.getPayments().isEmpty())) {
                        pay(order.getId(), orderDTO.getPayType(), orderDTO.getPayAmount(), null);
                    }
                } else if (existOrder.getPayStatus() != null && existOrder.getPayStatus() != 1) {
                    if (orderDTO.getPayments() != null && !orderDTO.getPayments().isEmpty()) {
                        for (OrderPaymentSyncDTO paymentDTO : orderDTO.getPayments()) {
                            if (paymentDTO.getPayStatus() != null && paymentDTO.getPayStatus() == 1) {
                                pay(existOrder.getId(), paymentDTO.getPayType(), paymentDTO.getPayAmount(), paymentDTO.getTransactionId());
                            }
                        }
                    } else if (orderDTO.getPayStatus() != null && orderDTO.getPayStatus() == 1) {
                        pay(existOrder.getId(), orderDTO.getPayType(), orderDTO.getPayAmount(), null);
                    }
                }

                successCount++;
            } catch (Exception e) {
                failCount++;
                Map<String, Object> failInfo = new HashMap<>();
                failInfo.put("order_no", orderDTO.getOrderNo());
                failInfo.put("error", e.getMessage());
                failOrders.add(failInfo);
                log.error("批量同步订单失败, order_no={}, error={}", orderDTO.getOrderNo(), e.getMessage());
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("total", total);
        result.put("successCount", successCount);
        result.put("failCount", failCount);
        result.put("failOrders", failOrders);
        return result;
    }

    private Order createOrderFromDTO(OrderSyncDTO dto) {
        Order order = new Order();
        order.setOrderNo(dto.getOrderNo());
        order.setErpOrderId(dto.getErpOrderId());
        order.setTotalAmount(dto.getTotalAmount() != null ? dto.getTotalAmount() : BigDecimal.ZERO);
        order.setDiscountAmount(dto.getDiscountAmount() != null ? dto.getDiscountAmount() : BigDecimal.ZERO);
        order.setPayAmount(dto.getPayAmount() != null ? dto.getPayAmount() : BigDecimal.ZERO);
        order.setPayStatus(dto.getPayStatus() != null ? dto.getPayStatus() : 0);
        order.setOrderStatus(dto.getOrderStatus() != null ? dto.getOrderStatus() : 1);
        order.setSyncStatus(dto.getSyncStatus() != null ? dto.getSyncStatus() : 0);
        order.setSyncAttempts(dto.getSyncAttempts() != null ? dto.getSyncAttempts() : 0);
        order.setSyncErrorMessage(dto.getSyncError());
        order.setCashierId(dto.getCashierId());
        order.setCashierName(dto.getCashierName());
        order.setRemark(dto.getRemark());
        if (dto.getCreatedAt() != null) {
            order.setCreateTime(dto.getCreatedAt());
        }
        return order;
    }

    private List<OrderItem> convertOrderItems(List<OrderItemSyncDTO> itemDTOs, Long orderId, String orderNo) {
        List<OrderItem> items = new ArrayList<>();
        if (itemDTOs == null) {
            return items;
        }
        for (OrderItemSyncDTO dto : itemDTOs) {
            OrderItem item = new OrderItem();
            item.setOrderId(orderId);
            item.setOrderNo(orderNo);
            item.setProductId(dto.getProductId());
            item.setErpGoodsId(dto.getErpGoodsId());
            item.setProductName(dto.getProductName());
            item.setImage(dto.getImage());
            item.setPrice(dto.getPrice() != null ? dto.getPrice() : BigDecimal.ZERO);
            item.setQuantity(dto.getQuantity() != null ? dto.getQuantity() : 0);
            item.setTotalAmount(dto.getTotalAmount() != null ? dto.getTotalAmount() : dto.getSubtotal() != null ? dto.getSubtotal() : BigDecimal.ZERO);
            item.setDiscountAmount(dto.getDiscountAmount() != null ? dto.getDiscountAmount() : BigDecimal.ZERO);
            item.setPayAmount(dto.getPayAmount() != null ? dto.getPayAmount() : dto.getSubtotal() != null ? dto.getSubtotal() : BigDecimal.ZERO);
            items.add(item);
        }
        return items;
    }

    private List<SalesSummary> convertSalesSummaries(List<OrderItemSyncDTO> itemDTOs, LocalDate orderDate) {
        List<SalesSummary> summaries = new ArrayList<>();
        if (itemDTOs == null) {
            return summaries;
        }
        for (OrderItemSyncDTO dto : itemDTOs) {
            SalesSummary summary = new SalesSummary();
            summary.setErpGoodsId(dto.getErpGoodsId());
            summary.setProductName(dto.getProductName());
            summary.setQuantity(dto.getQuantity() != null ? dto.getQuantity() : 0);
            summary.setTotalAmount(dto.getTotalAmount() != null ? dto.getTotalAmount() : dto.getSubtotal() != null ? dto.getSubtotal() : BigDecimal.ZERO);
            summary.setOrderDate(orderDate);
            summary.setSyncStatus(0);
            summary.setSyncAttempts(0);
            summaries.add(summary);
        }
        return summaries;
    }
}
