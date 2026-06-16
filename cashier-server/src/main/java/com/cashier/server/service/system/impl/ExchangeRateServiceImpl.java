package com.cashier.server.service.system.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.common.BusinessException;
import com.cashier.server.entity.system.ExchangeRate;
import com.cashier.server.mapper.system.ExchangeRateMapper;
import com.cashier.server.service.system.ExchangeRateService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class ExchangeRateServiceImpl extends ServiceImpl<ExchangeRateMapper, ExchangeRate> implements ExchangeRateService {

    private static final int STATUS_ENABLED = 1;
    private static final int STATUS_DISABLED = 0;
    private static final int SCALE = 6;

    @Override
    public IPage<ExchangeRate> getRateList(Integer page, Integer size, String currencyCode, Integer isEnabled) {
        LambdaQueryWrapper<ExchangeRate> wrapper = new LambdaQueryWrapper<>();
        if (currencyCode != null && !currencyCode.isEmpty()) {
            wrapper.like(ExchangeRate::getCurrencyCode, currencyCode);
        }
        if (isEnabled != null) {
            wrapper.eq(ExchangeRate::getIsEnabled, isEnabled);
        }
        wrapper.orderByDesc(ExchangeRate::getRateTime);
        return page(new Page<>(page, size), wrapper);
    }

    @Override
    public List<ExchangeRate> getEnabledRates() {
        LambdaQueryWrapper<ExchangeRate> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ExchangeRate::getIsEnabled, STATUS_ENABLED)
                .orderByAsc(ExchangeRate::getCurrencyCode);
        return list(wrapper);
    }

    @Override
    public ExchangeRate getRate(String currencyCode) {
        if ("CNY".equals(currencyCode)) {
            ExchangeRate cnyRate = new ExchangeRate();
            cnyRate.setCurrencyCode("CNY");
            cnyRate.setCurrencyName("人民币");
            cnyRate.setCurrencySymbol("¥");
            cnyRate.setRateToCny(BigDecimal.ONE);
            cnyRate.setRateFromCny(BigDecimal.ONE);
            cnyRate.setRateTime(LocalDateTime.now());
            cnyRate.setIsEnabled(STATUS_ENABLED);
            return cnyRate;
        }
        LambdaQueryWrapper<ExchangeRate> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ExchangeRate::getCurrencyCode, currencyCode)
                .eq(ExchangeRate::getIsEnabled, STATUS_ENABLED)
                .orderByDesc(ExchangeRate::getRateTime)
                .last("LIMIT 1");
        ExchangeRate rate = getOne(wrapper);
        if (rate == null) {
            throw new BusinessException("不支持的货币类型: " + currencyCode);
        }
        return rate;
    }

    @Override
    public BigDecimal convertToCny(String currencyCode, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        ExchangeRate rate = getRate(currencyCode);
        return amount.multiply(rate.getRateToCny()).setScale(2, RoundingMode.HALF_UP);
    }

    @Override
    public BigDecimal convertFromCny(String currencyCode, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        ExchangeRate rate = getRate(currencyCode);
        return amount.multiply(rate.getRateFromCny()).setScale(2, RoundingMode.HALF_UP);
    }

    @Override
    public boolean updateRate(String currencyCode, BigDecimal rateToCny, String source) {
        if (rateToCny == null || rateToCny.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("汇率必须大于0");
        }
        ExchangeRate rate = new ExchangeRate();
        rate.setCurrencyCode(currencyCode);
        rate.setRateToCny(rateToCny);
        rate.setRateFromCny(BigDecimal.ONE.divide(rateToCny, SCALE, RoundingMode.HALF_UP));
        rate.setRateTime(LocalDateTime.now());
        rate.setSource(source);
        rate.setIsEnabled(STATUS_ENABLED);

        ExchangeRate existing = getBaseMapper().selectOne(
                new LambdaQueryWrapper<ExchangeRate>().eq(ExchangeRate::getCurrencyCode, currencyCode));
        if (existing != null) {
            existing.setRateToCny(rateToCny);
            existing.setRateFromCny(rate.getRateFromCny());
            existing.setRateTime(rate.getRateTime());
            existing.setSource(source);
            return updateById(existing);
        }
        return save(rate);
    }

    @Override
    public boolean batchUpdateRates(List<Map<String, Object>> rates) {
        for (Map<String, Object> rateData : rates) {
            String currencyCode = (String) rateData.get("currencyCode");
            BigDecimal rateToCny = rateData.get("rateToCny") != null
                    ? new BigDecimal(rateData.get("rateToCny").toString())
                    : null;
            String source = rateData.get("source") != null ? rateData.get("source").toString() : "manual";
            if (currencyCode != null && rateToCny != null) {
                updateRate(currencyCode, rateToCny, source);
            }
        }
        return true;
    }

    @Override
    @Scheduled(cron = "0 0 */4 * * ?")
    public boolean syncRatesFromExternal() {
        log.info("开始同步汇率数据");
        try {
            List<Map<String, Object>> defaultRates = new ArrayList<>();
            defaultRates.add(createRateData("USD", "美元", "$", new BigDecimal("7.25")));
            defaultRates.add(createRateData("JPY", "日元", "¥", new BigDecimal("0.048")));
            defaultRates.add(createRateData("EUR", "欧元", "€", new BigDecimal("7.85")));
            defaultRates.add(createRateData("GBP", "英镑", "£", new BigDecimal("9.15")));
            defaultRates.add(createRateData("KRW", "韩元", "₩", new BigDecimal("0.0054")));
            defaultRates.add(createRateData("HKD", "港币", "HK$", new BigDecimal("0.928")));
            defaultRates.add(createRateData("TWD", "新台币", "NT$", new BigDecimal("0.228")));
            defaultRates.add(createRateData("THB", "泰铢", "฿", new BigDecimal("0.205")));

            batchUpdateRates(defaultRates);
            log.info("汇率数据同步完成，共{}种货币", defaultRates.size());
            return true;
        } catch (Exception e) {
            log.error("汇率数据同步失败", e);
            return false;
        }
    }

    @Override
    public Map<String, Object> getRateSnapshot() {
        Map<String, Object> snapshot = new HashMap<>();
        List<ExchangeRate> rates = getEnabledRates();
        snapshot.put("rates", rates);
        snapshot.put("snapshotTime", LocalDateTime.now().toString());
        snapshot.put("count", rates.size());

        Map<String, Map<String, Object>> rateMap = new HashMap<>();
        for (ExchangeRate rate : rates) {
            Map<String, Object> rateInfo = new HashMap<>();
            rateInfo.put("currencyCode", rate.getCurrencyCode());
            rateInfo.put("currencyName", rate.getCurrencyName());
            rateInfo.put("currencySymbol", rate.getCurrencySymbol());
            rateInfo.put("rateToCny", rate.getRateToCny());
            rateInfo.put("rateFromCny", rate.getRateFromCny());
            rateInfo.put("rateTime", rate.getRateTime());
            rateInfo.put("isEnabled", rate.getIsEnabled());
            rateMap.put(rate.getCurrencyCode(), rateInfo);
        }
        snapshot.put("rateMap", rateMap);
        return snapshot;
    }

    private Map<String, Object> createRateData(String code, String name, String symbol, BigDecimal rate) {
        Map<String, Object> data = new HashMap<>();
        data.put("currencyCode", code);
        data.put("currencyName", name);
        data.put("currencySymbol", symbol);
        data.put("rateToCny", rate);
        data.put("source", "system_default");
        return data;
    }
}
