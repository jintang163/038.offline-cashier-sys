package com.cashier.server.service.printer;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.printer.PrintRule;

import java.util.List;
import java.util.Map;

public interface PrintRuleService extends IService<PrintRule> {

    List<PrintRule> getAllRules();

    IPage<PrintRule> getRulePage(Integer page, Integer size, String keyword, Integer status);

    List<PrintRule> getSyncList(String updateTime, Integer status);

    List<PrintRule> getRulesByCategory(Long categoryId);

    boolean addRule(PrintRule rule);

    boolean updateRule(PrintRule rule);

    boolean deleteRule(Long id);

    Map<String, Object> resolvePrintersForOrder(List<Map<String, Object>> items);
}
