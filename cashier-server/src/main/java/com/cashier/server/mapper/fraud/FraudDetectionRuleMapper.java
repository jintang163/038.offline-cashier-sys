package com.cashier.server.mapper.fraud;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cashier.server.entity.fraud.FraudDetectionRule;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface FraudDetectionRuleMapper extends BaseMapper<FraudDetectionRule> {
}
