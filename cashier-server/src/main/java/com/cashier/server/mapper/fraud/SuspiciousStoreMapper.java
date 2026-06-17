package com.cashier.server.mapper.fraud;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cashier.server.entity.fraud.SuspiciousStore;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface SuspiciousStoreMapper extends BaseMapper<SuspiciousStore> {
}
