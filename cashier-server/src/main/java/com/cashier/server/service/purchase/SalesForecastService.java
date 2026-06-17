package com.cashier.server.service.purchase;

import com.cashier.server.dto.ForecastRequestDTO;
import com.cashier.server.entity.purchase.PurchaseSuggestionItem;

import java.util.List;
import java.util.Map;

public interface SalesForecastService {

    List<PurchaseSuggestionItem> calculatePurchaseSuggestions(ForecastRequestDTO request);

    Map<String, Object> calculateHistoricalSales(java.time.LocalDate startDate, java.time.LocalDate endDate);

    java.math.BigDecimal calculateSafetyStock(java.math.BigDecimal dailyAverage, Integer safetyStockDays);

    java.math.BigDecimal calculateSuggestedQuantity(java.math.BigDecimal forecastDemand, Integer availableStock,
                                                    java.math.BigDecimal safetyStock);
}
