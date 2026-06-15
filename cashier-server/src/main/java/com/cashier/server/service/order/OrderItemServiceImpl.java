package com.cashier.server.service.order;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.entity.order.OrderItem;
import com.cashier.server.mapper.order.OrderItemMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class OrderItemServiceImpl extends ServiceImpl<OrderItemMapper, OrderItem> implements OrderItemService {

    @Override
    public List<OrderItem> getByOrderId(Long orderId) {
        return lambdaQuery()
                .eq(OrderItem::getOrderId, orderId)
                .list();
    }
}
