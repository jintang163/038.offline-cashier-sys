package com.cashier.server.mapper.order;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cashier.server.entity.order.OrderItem;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface OrderItemMapper extends BaseMapper<OrderItem> {
}
