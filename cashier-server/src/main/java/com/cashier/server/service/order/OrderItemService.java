package com.cashier.server.service.order;

import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.order.OrderItem;

import java.util.List;

public interface OrderItemService extends IService<OrderItem> {

    List<OrderItem> getByOrderId(Long orderId);
}
