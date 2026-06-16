package com.cashier.server.service.system;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.system.ExchangeRate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public interface ExchangeRateService extends IService<ExchangeRate> {

    IPage<ExchangeRate> getRateList(Integer page, Integer size, String currencyCode, Integer status);

    List<ExchangeRate> getEnabledRates();

    ExchangeRate getRate(String currencyCode);

    BigDecimal convertToCny(String currencyCode, BigDecimal amount);

    BigDecimal convertFromCny(String currencyCode, BigDecimal amount);

    boolean updateRate(String currencyCode, BigDecimal rateToCny, String source);

    boolean batchUpdateRates(List<Map<String, Object>> rates);

    boolean syncRatesFromExternal();

    Map<String, Object> getRateSnapshot();
}
