package com.cashier.server.service.member;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.entity.member.PointRule;
import com.cashier.server.mapper.member.PointRuleMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PointRuleServiceImpl extends ServiceImpl<PointRuleMapper, PointRule> implements PointRuleService {

    @Override
    public List<PointRule> listActiveRules() {
        return baseMapper.listActiveRules();
    }
}
