package com.cashier.server.mapper.stock;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cashier.server.entity.stock.StockCheckItem;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface StockCheckItemMapper extends BaseMapper<StockCheckItem> {
}
