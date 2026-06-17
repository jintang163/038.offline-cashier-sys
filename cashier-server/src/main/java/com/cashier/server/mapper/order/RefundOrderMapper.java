package com.cashier.server.mapper.order;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cashier.server.entity.order.RefundOrder;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface RefundOrderMapper extends BaseMapper<RefundOrder> {
}
