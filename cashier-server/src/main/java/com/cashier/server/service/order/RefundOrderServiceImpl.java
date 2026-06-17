package com.cashier.server.service.order;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.common.BusinessException;
import com.cashier.server.dto.RefundOrderItemSyncDTO;
import com.cashier.server.dto.RefundOrderSyncDTO;
import com.cashier.server.entity.order.Order;
import com.cashier.server.entity.order.OrderItem;
import com.cashier.server.entity.order.RefundOrder;
import com.cashier.server.entity.order.RefundOrderItem;
import com.cashier.server.entity.product.ProductStock;
import com.cashier.server.mapper.order.RefundOrderMapper;
import com.cashier.server.service.erp.ErpSyncService;
import com.cashier.server.service.product.ProductStockService;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class RefundOrderServiceImpl extends ServiceImpl<RefundOrderMapper, RefundOrder> implements RefundOrderService {

    private static final Logger log = LoggerFactory.getLogger(RefundOrderServiceImpl.class);

    @Autowired
    private RefundOrderItemService refundOrderItemService;

    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderItemService orderItemService;

    @Autowired
    private ProductStockService productStockService;

    @Autowired(required = false)
    private ErpSyncService erpSyncService;

    @Override
    public IPage<RefundOrder> getRefundOrderList(Integer page, Integer size, Integer refundType, Integer auditStatus, Integer syncStatus, String keyword) {
        LambdaQueryWrapper<RefundOrder> wrapper = new LambdaQueryWrapper<>();
        if (refundType != null) {
            wrapper.eq(RefundOrder::getRefundType, refundType);
        }
        if (auditStatus != null) {
            wrapper.eq(RefundOrder::getAuditStatus, auditStatus);
        }
        if (syncStatus != null) {
            wrapper.eq(RefundOrder::getSyncStatus, syncStatus);
        }
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(RefundOrder::getRefundNo, keyword)
                    .or().like(RefundOrder::getOrderNo, keyword));
        }
        wrapper.orderByDesc(RefundOrder::getCreateTime);
        return page(new Page<>(page, size), wrapper);
    }

    @Override
    public RefundOrder getRefundOrderDetail(Long id) {
        return getById(id);
    }

    @Override
    public List<RefundOrderItem> getRefundOrderItems(Long refundOrderId) {
        return refundOrderItemService.lambdaQuery()
                .eq(RefundOrderItem::getRefundOrderId, refundOrderId)
                .list();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public RefundOrder createRefundOrder(Map<String, Object> params) {
        Long orderId = params.get("orderId") != null ? Long.valueOf(params.get("orderId").toString()) : null;
        Integer refundType = params.get("refundType") != null ? Integer.valueOf(params.get("refundType").toString()) : 1;
        String refundReason = params.get("refundReason") != null ? params.get("refundReason").toString() : null;
        Long cashierId = params.get("cashierId") != null ? Long.valueOf(params.get("cashierId").toString()) : null;
        String cashierName = params.get("cashierName") != null ? params.get("cashierName").toString() : null;
        Long managerId = params.get("managerId") != null ? Long.valueOf(params.get("managerId").toString()) : null;
        String managerName = params.get("managerName") != null ? params.get("managerName").toString() : null;
        String remark = params.get("remark") != null ? params.get("remark").toString() : null;

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> itemList = (List<Map<String, Object>>) params.get("items");

        if (orderId == null) {
            throw new BusinessException("原订单ID不能为空");
        }

        Order order = orderService.getById(orderId);
        if (order == null) {
            throw new BusinessException("原订单不存在");
        }
        if (order.getPayStatus() != 1) {
            throw new BusinessException("只有已支付的订单才能退款");
        }

        BigDecimal alreadyRefundedAmount = getTotalRefundedAmountByOrderId(orderId, null);
        BigDecimal availableRefundAmount = order.getPayAmount() != null
                ? order.getPayAmount().subtract(alreadyRefundedAmount)
                : BigDecimal.ZERO;
        if (availableRefundAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("该订单已无可退款金额");
        }

        List<OrderItem> originalItems = orderItemService.getOrderItems(orderId);
        Map<Long, OrderItem> originalItemMap = new HashMap<>();
        for (OrderItem item : originalItems) {
            originalItemMap.put(item.getId(), item);
        }

        BigDecimal totalRefundAmount = BigDecimal.ZERO;
        List<RefundOrderItem> refundItems = new ArrayList<>();

        if (refundType == 2) {
            for (OrderItem oi : originalItems) {
                int alreadyRefundedQty = getTotalRefundedQtyByOrderItemId(oi.getId(), null);
                int availableQty = oi.getQuantity() - alreadyRefundedQty;
                if (availableQty <= 0) {
                    continue;
                }

                RefundOrderItem ri = new RefundOrderItem();
                ri.setOrderItemId(oi.getId());
                ri.setProductId(oi.getProductId());
                ri.setErpGoodsId(oi.getErpGoodsId());
                ri.setProductName(oi.getProductName());
                ri.setPrice(oi.getPrice());
                ri.setOriginalQuantity(oi.getQuantity());
                ri.setRefundQuantity(availableQty);
                ri.setOriginalAmount(oi.getTotalAmount());
                BigDecimal totalPaidOfItem = oi.getPayAmount() != null ? oi.getPayAmount() : oi.getTotalAmount();
                BigDecimal unitPrice = oi.getQuantity() > 0
                        ? totalPaidOfItem.divide(new BigDecimal(oi.getQuantity()), 4, BigDecimal.ROUND_HALF_UP)
                        : oi.getPrice();
                BigDecimal itemRefund = unitPrice.multiply(new BigDecimal(availableQty));
                if (itemRefund.compareTo(availableRefundAmount.subtract(totalRefundAmount)) > 0) {
                    itemRefund = availableRefundAmount.subtract(totalRefundAmount);
                }
                ri.setRefundAmount(itemRefund);
                ri.setDiscountAmount(oi.getDiscountAmount());
                totalRefundAmount = totalRefundAmount.add(itemRefund);
                refundItems.add(ri);
            }
        } else {
            if (CollectionUtils.isEmpty(itemList)) {
                throw new BusinessException("部分退款必须指定退款商品");
            }
            for (Map<String, Object> item : itemList) {
                Long orderItemId = item.get("orderItemId") != null ? Long.valueOf(item.get("orderItemId").toString()) : null;
                Integer refundQuantity = item.get("refundQuantity") != null ? Integer.valueOf(item.get("refundQuantity").toString()) : 0;
                String itemRemark = item.get("remark") != null ? item.get("remark").toString() : null;

                if (orderItemId == null || refundQuantity <= 0) {
                    continue;
                }

                OrderItem oi = originalItemMap.get(orderItemId);
                if (oi == null) {
                    throw new BusinessException("订单明细不存在: " + orderItemId);
                }
                int alreadyRefundedQty = getTotalRefundedQtyByOrderItemId(oi.getId(), null);
                int availableQty = oi.getQuantity() - alreadyRefundedQty;
                if (availableQty <= 0) {
                    continue;
                }
                if (refundQuantity > availableQty) {
                    refundQuantity = availableQty;
                }

                BigDecimal unitPrice = oi.getPayAmount() != null && oi.getQuantity() > 0
                        ? oi.getPayAmount().divide(new BigDecimal(oi.getQuantity()), 4, BigDecimal.ROUND_HALF_UP)
                        : oi.getPrice();
                BigDecimal itemRefundAmount = unitPrice.multiply(new BigDecimal(refundQuantity));

                RefundOrderItem ri = new RefundOrderItem();
                ri.setOrderItemId(oi.getId());
                ri.setProductId(oi.getProductId());
                ri.setErpGoodsId(oi.getErpGoodsId());
                ri.setProductName(oi.getProductName());
                ri.setBarcode(item.get("barcode") != null ? item.get("barcode").toString() : oi.getBarcode());
                ri.setImage(item.get("image") != null ? item.get("image").toString() : oi.getImage());
                ri.setPrice(oi.getPrice());
                ri.setOriginalQuantity(oi.getQuantity());
                ri.setRefundQuantity(refundQuantity);
                ri.setOriginalAmount(oi.getTotalAmount());
                ri.setRefundAmount(itemRefundAmount);
                BigDecimal discountRatio = oi.getQuantity() > 0 ? new BigDecimal(refundQuantity).divide(new BigDecimal(oi.getQuantity()), 4, BigDecimal.ROUND_HALF_UP) : BigDecimal.ZERO;
                ri.setDiscountAmount(oi.getDiscountAmount() != null ? oi.getDiscountAmount().multiply(discountRatio) : BigDecimal.ZERO);
                ri.setRemark(itemRemark);
                totalRefundAmount = totalRefundAmount.add(itemRefundAmount);
                refundItems.add(ri);
            }
        }

        if (refundItems.isEmpty()) {
            throw new BusinessException("退款明细不能为空（无可退数量的商品已被自动过滤）");
        }

        if (totalRefundAmount.compareTo(availableRefundAmount) > 0) {
            totalRefundAmount = availableRefundAmount;
        }
        if (totalRefundAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("退款金额必须大于0");
        }

        String refundNo = generateRefundNo();

        RefundOrder refundOrder = new RefundOrder();
        refundOrder.setRefundNo(refundNo);
        refundOrder.setOrderId(orderId);
        refundOrder.setOrderNo(order.getOrderNo());
        refundOrder.setErpOrderId(order.getErpOrderId());
        refundOrder.setRefundType(refundType);
        refundOrder.setRefundAmount(totalRefundAmount);
        refundOrder.setOriginalPayAmount(order.getPayAmount());
        refundOrder.setRefundReason(refundReason);
        refundOrder.setAuditStatus(0);
        refundOrder.setSyncStatus(0);
        refundOrder.setSyncAttempts(0);
        refundOrder.setErpPushStatus(0);
        refundOrder.setCashierId(cashierId);
        refundOrder.setCashierName(cashierName);
        refundOrder.setManagerId(managerId);
        refundOrder.setManagerName(managerName);
        refundOrder.setRemark(remark);
        save(refundOrder);

        for (RefundOrderItem ri : refundItems) {
            ri.setRefundOrderId(refundOrder.getId());
            ri.setRefundNo(refundNo);
            refundOrderItemService.save(ri);
        }

        return refundOrder;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean auditRefund(Long refundOrderId, Integer auditStatus, Long auditorId, String auditorName, String auditRemark) {
        RefundOrder refundOrder = getById(refundOrderId);
        if (refundOrder == null) {
            throw new BusinessException("退款单不存在");
        }
        if (refundOrder.getAuditStatus() != 0) {
            throw new BusinessException("该退款单已审核，不能重复审核");
        }
        if (auditStatus != 1 && auditStatus != 2) {
            throw new BusinessException("审核状态无效");
        }

        refundOrder.setAuditStatus(auditStatus);
        refundOrder.setAuditorId(auditorId);
        refundOrder.setAuditorName(auditorName);
        refundOrder.setAuditTime(LocalDateTime.now());
        refundOrder.setAuditRemark(auditRemark);
        boolean result = updateById(refundOrder);

        if (auditStatus == 1 && result) {
            List<RefundOrderItem> items = getRefundOrderItems(refundOrderId);
            for (RefundOrderItem item : items) {
                if (item.getProductId() != null && item.getRefundQuantity() != null && item.getRefundQuantity() > 0) {
                    ProductStock stock = productStockService.getStockByProductId(item.getProductId());
                    if (stock != null) {
                        productStockService.addStock(item.getProductId(), item.getRefundQuantity());
                    }
                }
            }

            if (refundOrder.getSyncStatus() == 1 && (refundOrder.getErpPushStatus() == null || refundOrder.getErpPushStatus() != 1)) {
                final Long finalRefundId = refundOrderId;
                new Thread(() -> {
                    try {
                        pushToErp(finalRefundId);
                    } catch (Exception e) {
                        log.warn("审核后自动推送ERP红字单失败，退款单ID: {}, 错误: {}", finalRefundId, e.getMessage());
                    }
                }).start();
            }
        }

        return result;
    }

    @Override
    public boolean updateSyncStatus(Long refundOrderId, Integer syncStatus, String errorMessage) {
        RefundOrder update = new RefundOrder();
        update.setId(refundOrderId);
        update.setSyncStatus(syncStatus);
        if (syncStatus == 1) {
            update.setSyncTime(LocalDateTime.now());
        }
        if (errorMessage != null) {
            update.setSyncErrorMessage(errorMessage);
        }
        return updateById(update);
    }

    @Override
    public List<RefundOrder> getUnsyncedRefundOrders(Integer maxRetry, Integer limit) {
        LambdaQueryWrapper<RefundOrder> wrapper = new LambdaQueryWrapper<>();
        wrapper.ne(RefundOrder::getSyncStatus, 1);
        wrapper.ne(RefundOrder::getAuditStatus, 2);
        wrapper.lt(RefundOrder::getSyncAttempts, maxRetry);
        wrapper.orderByAsc(RefundOrder::getCreateTime);
        wrapper.last("LIMIT " + limit);
        return list(wrapper);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> batchSyncRefundOrders(List<RefundOrderSyncDTO> refundOrderList) {
        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> successList = new ArrayList<>();
        List<Map<String, Object>> failList = new ArrayList<>();
        List<Long> auditPassedNeedPushIds = new ArrayList<>();

        for (RefundOrderSyncDTO dto : refundOrderList) {
            try {
                RefundOrder existing = lambdaQuery()
                        .eq(RefundOrder::getRefundNo, dto.getRefundNo())
                        .one();

                RefundOrder refundOrder;
                if (existing != null) {
                    refundOrder = existing;
                    BeanUtils.copyProperties(dto, refundOrder, "id", "createTime", "updateTime", "isDeleted");
                    updateById(refundOrder);
                } else {
                    refundOrder = new RefundOrder();
                    BeanUtils.copyProperties(dto, refundOrder, "id");
                    save(refundOrder);
                }

                if (dto.getItems() != null && !dto.getItems().isEmpty()) {
                    refundOrderItemService.lambdaUpdate()
                            .eq(RefundOrderItem::getRefundOrderId, refundOrder.getId())
                            .remove();

                    for (RefundOrderItemSyncDTO itemDto : dto.getItems()) {
                        RefundOrderItem item = new RefundOrderItem();
                        BeanUtils.copyProperties(itemDto, item, "id");
                        item.setRefundOrderId(refundOrder.getId());
                        item.setRefundNo(refundOrder.getRefundNo());
                        refundOrderItemService.save(item);
                    }
                }

                if (refundOrder.getAuditStatus() != null && refundOrder.getAuditStatus() == 1
                        && refundOrder.getSyncStatus() != 1) {
                    updateSyncStatus(refundOrder.getId(), 1, null);
                }

                lambdaUpdate()
                        .setSql("sync_attempts = sync_attempts + 1")
                        .eq(RefundOrder::getId, refundOrder.getId())
                        .update();

                if (refundOrder.getAuditStatus() != null && refundOrder.getAuditStatus() == 1
                        && (refundOrder.getErpPushStatus() == null || refundOrder.getErpPushStatus() != 1)) {
                    auditPassedNeedPushIds.add(refundOrder.getId());
                }

                Map<String, Object> success = new HashMap<>();
                success.put("refundNo", dto.getRefundNo());
                success.put("id", refundOrder.getId());
                success.put("auditStatus", refundOrder.getAuditStatus());
                success.put("erpPushStatus", refundOrder.getErpPushStatus());
                successList.add(success);
            } catch (Exception e) {
                log.error("同步退款单失败: {}, 错误: {}", dto.getRefundNo(), e.getMessage(), e);
                Map<String, Object> fail = new HashMap<>();
                fail.put("refundNo", dto.getRefundNo());
                fail.put("error", e.getMessage());
                failList.add(fail);

                if (dto.getId() != null) {
                    lambdaUpdate()
                            .setSql("sync_attempts = sync_attempts + 1")
                            .eq(RefundOrder::getId, dto.getId())
                            .update();
                }
            }
        }

        result.put("successCount", successList.size());
        result.put("failCount", failList.size());
        result.put("successOrders", successList);
        result.put("failOrders", failList);

        if (!auditPassedNeedPushIds.isEmpty()) {
            final List<Long> idsToPush = auditPassedNeedPushIds;
            new Thread(() -> {
                for (Long refundId : idsToPush) {
                    try {
                        pushToErp(refundId);
                    } catch (Exception e) {
                        log.warn("同步后自动触发ERP红字单失败，退款单ID: {}, 错误: {}", refundId, e.getMessage());
                    }
                }
            }).start();
        }

        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean pushToErp(Long refundOrderId) {
        RefundOrder refundOrder = getById(refundOrderId);
        if (refundOrder == null) {
            throw new BusinessException("退款单不存在");
        }
        if (refundOrder.getAuditStatus() != 1) {
            throw new BusinessException("只有审核通过的退款单才能推送ERP");
        }
        if (refundOrder.getErpPushStatus() == 1) {
            return true;
        }

        List<RefundOrderItem> items = getRefundOrderItems(refundOrderId);

        try {
            if (erpSyncService != null) {
                String erpRefundId = erpSyncService.pushRedSalesOrder(refundOrder, items);
                refundOrder.setErpRefundId(erpRefundId);
                refundOrder.setErpPushStatus(1);
                refundOrder.setErpPushTime(LocalDateTime.now());
                refundOrder.setErpPushError(null);
            } else {
                refundOrder.setErpPushStatus(1);
                refundOrder.setErpPushTime(LocalDateTime.now());
                refundOrder.setErpRefundId("ERP" + System.currentTimeMillis());
            }
            return updateById(refundOrder);
        } catch (Exception e) {
            refundOrder.setErpPushStatus(2);
            refundOrder.setErpPushError(e.getMessage());
            updateById(refundOrder);
            throw new BusinessException("ERP推送失败: " + e.getMessage());
        }
    }

    @Override
    public List<RefundOrder> getPendingAuditList(Integer page, Integer size) {
        LambdaQueryWrapper<RefundOrder> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(RefundOrder::getAuditStatus, 0);
        wrapper.orderByAsc(RefundOrder::getCreateTime);
        wrapper.last("LIMIT " + ((page - 1) * size) + ", " + size);
        return list(wrapper);
    }

    @Override
    public int getTotalRefundedQtyByOrderItemId(Long orderItemId, Long excludeRefundOrderId) {
        if (orderItemId == null) {
            return 0;
        }
        LambdaQueryWrapper<RefundOrder> orderWrapper = new LambdaQueryWrapper<>();
        orderWrapper.ne(RefundOrder::getAuditStatus, 2);
        if (excludeRefundOrderId != null) {
            orderWrapper.ne(RefundOrder::getId, excludeRefundOrderId);
        }
        List<Long> validRefundIds = list(orderWrapper).stream().map(RefundOrder::getId).toList();
        if (validRefundIds.isEmpty()) {
            return 0;
        }
        LambdaQueryWrapper<RefundOrderItem> itemWrapper = new LambdaQueryWrapper<>();
        itemWrapper.eq(RefundOrderItem::getOrderItemId, orderItemId);
        itemWrapper.in(RefundOrderItem::getRefundOrderId, validRefundIds);
        List<RefundOrderItem> items = refundOrderItemService.list(itemWrapper);
        int total = 0;
        for (RefundOrderItem it : items) {
            if (it.getRefundQuantity() != null) {
                total += it.getRefundQuantity();
            }
        }
        return total;
    }

    @Override
    public BigDecimal getTotalRefundedAmountByOrderId(Long orderId, Long excludeRefundOrderId) {
        if (orderId == null) {
            return BigDecimal.ZERO;
        }
        LambdaQueryWrapper<RefundOrder> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(RefundOrder::getOrderId, orderId);
        wrapper.ne(RefundOrder::getAuditStatus, 2);
        if (excludeRefundOrderId != null) {
            wrapper.ne(RefundOrder::getId, excludeRefundOrderId);
        }
        List<RefundOrder> refunds = list(wrapper);
        BigDecimal total = BigDecimal.ZERO;
        for (RefundOrder r : refunds) {
            if (r.getRefundAmount() != null) {
                total = total.add(r.getRefundAmount());
            }
        }
        return total;
    }

    private String generateRefundNo() {
        return "RF" + System.currentTimeMillis() + String.format("%04d", (int) (Math.random() * 10000));
    }
}
