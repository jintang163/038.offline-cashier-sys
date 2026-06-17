package com.cashier.server.service.order;

import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.order.RefundOrderItem;

import java.util.List;

public interface RefundOrderItemService extends IService<RefundOrderItem> {

    List<RefundOrderItem> getByRefundOrderId(Long refundOrderId);
}
