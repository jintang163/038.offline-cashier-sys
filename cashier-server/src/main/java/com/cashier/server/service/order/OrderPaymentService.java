package com.cashier.server.service.order;

import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.order.OrderPayment;

import java.util.List;

public interface OrderPaymentService extends IService<OrderPayment> {

    List<OrderPayment> getByOrderId(Long orderId);
}
