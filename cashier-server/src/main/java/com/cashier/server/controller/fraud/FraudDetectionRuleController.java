package com.cashier.server.controller.fraud;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.Result;
import com.cashier.server.entity.fraud.FraudDetectionRule;
import com.cashier.server.service.fraud.FraudDetectionRuleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/fraud/rules")
public class FraudDetectionRuleController {

    @Autowired
    private FraudDetectionRuleService fraudDetectionRuleService;

    @GetMapping("/list")
    public Result<IPage<FraudDetectionRule>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String ruleType,
            @RequestParam(required = false) Integer status) {
        return Result.success(fraudDetectionRuleService.getRuleList(page, size, ruleType, status));
    }

    @GetMapping("/enabled")
    public Result<List<FraudDetectionRule>> getEnabledRules(
            @RequestParam(required = false) String ruleType) {
        if (ruleType != null) {
            return Result.success(fraudDetectionRuleService.getEnabledRulesByType(ruleType));
        }
        return Result.success(fraudDetectionRuleService.getEnabledRules());
    }

    @GetMapping("/{id}")
    public Result<FraudDetectionRule> detail(@PathVariable Long id) {
        return Result.success(fraudDetectionRuleService.getById(id));
    }

    @PostMapping
    public Result<FraudDetectionRule> create(@RequestBody FraudDetectionRule rule) {
        fraudDetectionRuleService.createRule(rule);
        return Result.success(rule);
    }

    @PutMapping
    public Result<Void> update(@RequestBody FraudDetectionRule rule) {
        fraudDetectionRuleService.updateRule(rule);
        return Result.success();
    }

    @PutMapping("/{id}/status")
    public Result<Void> toggleStatus(
            @PathVariable Long id,
            @RequestParam Integer status) {
        fraudDetectionRuleService.toggleRuleStatus(id, status);
        return Result.success();
    }
}
