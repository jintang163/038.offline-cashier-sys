package com.cashier.server.mapper.order;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cashier.server.entity.order.SalesSummary;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface SalesSummaryMapper extends BaseMapper<SalesSummary> {
}
