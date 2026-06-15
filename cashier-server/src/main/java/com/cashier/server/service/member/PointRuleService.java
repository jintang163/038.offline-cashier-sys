package com.cashier.server.service.member;

import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.member.PointRule;

import java.util.List;

public interface PointRuleService extends IService<PointRule> {

    List<PointRule> listActiveRules();
}
