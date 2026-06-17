package com.cashier.server.service.fraud;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.fraud.FraudDetectionRule;

import java.util.List;

public interface FraudDetectionRuleService extends IService<FraudDetectionRule> {

    IPage<FraudDetectionRule> getRuleList(Integer page, Integer size, String ruleType, Integer status);

    List<FraudDetectionRule> getEnabledRules();

    List<FraudDetectionRule> getEnabledRulesByType(String ruleType);

    FraudDetectionRule getRuleByCode(String ruleCode);

    boolean createRule(FraudDetectionRule rule);

    boolean updateRule(FraudDetectionRule rule);

    boolean toggleRuleStatus(Long id, Integer status);
}
