package com.cashier.server.service.order;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.entity.order.OrderPayment;
import com.cashier.server.mapper.order.OrderPaymentMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class OrderPaymentServiceImpl extends ServiceImpl<OrderPaymentMapper, OrderPayment> implements OrderPaymentService {

    @Override
    public List<OrderPayment> getByOrderId(Long orderId) {
        return lambdaQuery()
                .eq(OrderPayment::getOrderId, orderId)
                .list();
    }
}
