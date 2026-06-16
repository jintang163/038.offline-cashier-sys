package com.cashier.server.mapper.stock;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cashier.server.entity.stock.StockCheckRecord;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface StockCheckRecordMapper extends BaseMapper<StockCheckRecord> {
}
