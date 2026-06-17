package com.cashier.server.service.fraud;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.common.BusinessException;
import com.cashier.server.entity.fraud.FraudDetectionRule;
import com.cashier.server.mapper.fraud.FraudDetectionRuleMapper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class FraudDetectionRuleServiceImpl extends ServiceImpl<FraudDetectionRuleMapper, FraudDetectionRule> implements FraudDetectionRuleService {

    @Override
    public IPage<FraudDetectionRule> getRuleList(Integer page, Integer size, String ruleType, Integer status) {
        LambdaQueryWrapper<FraudDetectionRule> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(ruleType)) {
            wrapper.eq(FraudDetectionRule::getRuleType, ruleType);
        }
        if (status != null) {
            wrapper.eq(FraudDetectionRule::getStatus, status);
        }
        wrapper.orderByDesc(FraudDetectionRule::getCreateTime);
        return page(new Page<>(page, size), wrapper);
    }

    @Override
    public List<FraudDetectionRule> getEnabledRules() {
        return list(new LambdaQueryWrapper<FraudDetectionRule>()
                .eq(FraudDetectionRule::getStatus, 1)
                .orderByAsc(FraudDetectionRule::getRiskLevel));
    }

    @Override
    public List<FraudDetectionRule> getEnabledRulesByType(String ruleType) {
        return list(new LambdaQueryWrapper<FraudDetectionRule>()
                .eq(FraudDetectionRule::getStatus, 1)
                .eq(FraudDetectionRule::getRuleType, ruleType)
                .orderByAsc(FraudDetectionRule::getRiskLevel));
    }

    @Override
    public FraudDetectionRule getRuleByCode(String ruleCode) {
        return getOne(new LambdaQueryWrapper<FraudDetectionRule>()
                .eq(FraudDetectionRule::getRuleCode, ruleCode));
    }

    @Override
    public boolean createRule(FraudDetectionRule rule) {
        FraudDetectionRule existing = getRuleByCode(rule.getRuleCode());
        if (existing != null) {
            throw new BusinessException("规则编码已存在");
        }
        return save(rule);
    }

    @Override
    public boolean updateRule(FraudDetectionRule rule) {
        if (rule.getId() == null) {
            throw new BusinessException("规则ID不能为空");
        }
        return updateById(rule);
    }

    @Override
    public boolean toggleRuleStatus(Long id, Integer status) {
        FraudDetectionRule rule = getById(id);
        if (rule == null) {
            throw new BusinessException("规则不存在");
        }
        rule.setStatus(status);
        return updateById(rule);
    }
}
