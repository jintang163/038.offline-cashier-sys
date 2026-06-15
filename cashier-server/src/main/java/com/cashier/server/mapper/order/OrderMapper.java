package com.cashier.server.mapper.order;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cashier.server.entity.order.Order;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface OrderMapper extends BaseMapper<Order> {
}
