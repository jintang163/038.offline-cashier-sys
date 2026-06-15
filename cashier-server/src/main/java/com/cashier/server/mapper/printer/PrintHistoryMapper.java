package com.cashier.server.mapper.printer;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cashier.server.entity.printer.PrintHistory;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface PrintHistoryMapper extends BaseMapper<PrintHistory> {
}
