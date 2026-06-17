package com.cashier.server.mapper.fraud;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cashier.server.entity.fraud.OperationLockLog;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface OperationLockLogMapper extends BaseMapper<OperationLockLog> {
}
