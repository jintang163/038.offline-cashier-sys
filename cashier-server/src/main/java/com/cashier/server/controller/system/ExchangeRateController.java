package com.cashier.server.controller.system;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.BusinessException;
import com.cashier.server.common.Result;
import com.cashier.server.entity.system.ExchangeRate;
import com.cashier.server.service.system.ExchangeRateService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/exchange-rate")
public class ExchangeRateController {

    @Autowired
    private ExchangeRateService exchangeRateService;

    @GetMapping("/list")
    public Result<IPage<ExchangeRate>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size,
            @RequestParam(required = false) String currencyCode,
            @RequestParam(required = false) Integer status) {
        return Result.success(exchangeRateService.getRateList(page, size, currencyCode, status));
    }

    @GetMapping("/enabled")
    public Result<List<ExchangeRate>> getEnabledRates() {
        return Result.success(exchangeRateService.getEnabledRates());
    }

    @GetMapping("/{currencyCode}")
    public Result<ExchangeRate> getRate(@PathVariable String currencyCode) {
        try {
            return Result.success(exchangeRateService.getRate(currencyCode));
        } catch (BusinessException e) {
            return Result.fail(e.getMessage());
        }
    }

    @GetMapping("/snapshot")
    public Result<Map<String, Object>> getSnapshot() {
        return Result.success(exchangeRateService.getRateSnapshot());
    }

    @PostMapping("/convert/to-cny")
    public Result<Map<String, Object>> convertToCny(
            @RequestParam String currencyCode,
            @RequestParam BigDecimal amount) {
        try {
            BigDecimal result = exchangeRateService.convertToCny(currencyCode, amount);
            ExchangeRate rate = exchangeRateService.getRate(currencyCode);
            Map<String, Object> data = Map.of(
                    "originalAmount", amount,
                    "originalCurrency", currencyCode,
                    "cnyAmount", result,
                    "rate", rate.getRateToCny()
            );
            return Result.success(data);
        } catch (BusinessException e) {
            return Result.fail(e.getMessage());
        }
    }

    @PostMapping("/convert/from-cny")
    public Result<Map<String, Object>> convertFromCny(
            @RequestParam String currencyCode,
            @RequestParam BigDecimal amount) {
        try {
            BigDecimal result = exchangeRateService.convertFromCny(currencyCode, amount);
            ExchangeRate rate = exchangeRateService.getRate(currencyCode);
            Map<String, Object> data = Map.of(
                    "cnyAmount", amount,
                    "targetCurrency", currencyCode,
                    "targetAmount", result,
                    "rate", rate.getRateFromCny()
            );
            return Result.success(data);
        } catch (BusinessException e) {
            return Result.fail(e.getMessage());
        }
    }

    @PostMapping("/sync")
    public Result<Map<String, Object>> syncRates() {
        log.info("手动触发汇率同步");
        try {
            boolean success = exchangeRateService.syncRatesFromExternal();
            if (success) {
                return Result.success(Map.of("success", true, "message", "汇率同步成功"));
            } else {
                return Result.fail("汇率同步失败");
            }
        } catch (Exception e) {
            log.error("汇率同步异常", e);
            return Result.fail("汇率同步异常: " + e.getMessage());
        }
    }

    @PostMapping("/update")
    public Result<Map<String, Object>> updateRate(
            @RequestParam String currencyCode,
            @RequestParam BigDecimal rateToCny,
            @RequestParam(defaultValue = "manual") String source) {
        log.info("更新汇率，currencyCode={}, rateToCny={}", currencyCode, rateToCny);
        try {
            boolean success = exchangeRateService.updateRate(currencyCode, rateToCny, source);
            return Result.success(Map.of("success", success));
        } catch (BusinessException e) {
            return Result.fail(e.getMessage());
        }
    }

    @PostMapping("/batch-update")
    public Result<Map<String, Object>> batchUpdateRates(@RequestBody List<Map<String, Object>> rates) {
        log.info("批量更新汇率，共{}条", rates.size());
        try {
            boolean success = exchangeRateService.batchUpdateRates(rates);
            return Result.success(Map.of("success", success));
        } catch (BusinessException e) {
            return Result.fail(e.getMessage());
        }
    }
}
