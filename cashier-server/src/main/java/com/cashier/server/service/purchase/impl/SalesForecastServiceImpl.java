package com.cashier.server.service.purchase.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.cashier.server.dto.ForecastRequestDTO;
import com.cashier.server.entity.order.OrderItem;
import com.cashier.server.entity.product.Product;
import com.cashier.server.entity.product.ProductStock;
import com.cashier.server.entity.purchase.PurchaseSuggestionItem;
import com.cashier.server.service.order.OrderItemService;
import com.cashier.server.service.product.ProductService;
import com.cashier.server.service.product.ProductStockService;
import com.cashier.server.service.purchase.SalesForecastService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SalesForecastServiceImpl implements SalesForecastService {

    private static final Logger log = LoggerFactory.getLogger(SalesForecastServiceImpl.class);

    private static final int DEFAULT_HISTORY_DAYS = 14;

    @Autowired
    private OrderItemService orderItemService;

    @Autowired
    private ProductService productService;

    @Autowired
    private ProductStockService productStockService;

    @Override
    public List<PurchaseSuggestionItem> calculatePurchaseSuggestions(ForecastRequestDTO request) {
        LocalDate forecastEndDate = request.getEndDate() != null ? request.getEndDate() : LocalDate.now();
        LocalDate forecastStartDate = request.getStartDate() != null ? request.getStartDate() : forecastEndDate.minusDays(DEFAULT_HISTORY_DAYS);
        int forecastDays = request.getForecastDays() != null ? request.getForecastDays() : 7;
        int safetyStockDays = request.getSafetyStockDays() != null ? request.getSafetyStockDays() : 3;

        log.info("开始计算采购建议, 历史周期: {} ~ {}, 预测天数: {}, 安全库存天数: {}",
                forecastStartDate, forecastEndDate, forecastDays, safetyStockDays);

        List<OrderItem> orderItems = getOrderItemsInRange(forecastStartDate, forecastEndDate);
        if (orderItems.isEmpty()) {
            log.warn("历史周期内无销售数据，无法计算采购建议");
            return new ArrayList<>();
        }

        Map<Long, BigDecimal> salesMap = orderItems.stream()
                .filter(item -> item.getProductId() != null && item.getQuantity() != null)
                .collect(Collectors.groupingBy(
                        OrderItem::getProductId,
                        Collectors.reducing(
                                BigDecimal.ZERO,
                                item -> BigDecimal.valueOf(item.getQuantity()),
                                BigDecimal::add
                        )
                ));

        long actualDays = ChronoUnit.DAYS.between(forecastStartDate, forecastEndDate) + 1;
        if (actualDays <= 0) actualDays = 1;

        List<Product> products = productService.list(new LambdaQueryWrapper<Product>()
                .eq(Product::getStatus, 1)
                .in(Product::getId, salesMap.keySet()));

        List<ProductStock> stockList = productStockService.list(new LambdaQueryWrapper<ProductStock>()
                .in(ProductStock::getProductId, salesMap.keySet()));

        Map<Long, ProductStock> stockMap = stockList.stream()
                .collect(Collectors.toMap(ProductStock::getProductId, s -> s, (s1, s2) -> s1));

        Map<Long, Product> productMap = products.stream()
                .collect(Collectors.toMap(Product::getId, p -> p));

        List<PurchaseSuggestionItem> suggestionItems = new ArrayList<>();

        for (Map.Entry<Long, BigDecimal> entry : salesMap.entrySet()) {
            Long productId = entry.getKey();
            BigDecimal totalSales = entry.getValue();
            Product product = productMap.get(productId);
            ProductStock stock = stockMap.get(productId);

            if (product == null) continue;

            PurchaseSuggestionItem item = new PurchaseSuggestionItem();
            item.setProductId(productId);
            item.setErpGoodsId(product.getErpGoodsId());
            item.setProductName(product.getProductName());
            item.setCategoryName(product.getCategoryName());
            item.setUnit(product.getUnit());

            BigDecimal dailyAverage = totalSales.divide(BigDecimal.valueOf(actualDays), 4, RoundingMode.HALF_UP);
            BigDecimal forecastSales = dailyAverage.multiply(BigDecimal.valueOf(forecastDays))
                    .setScale(2, RoundingMode.HALF_UP);

            int currentStock = stock != null && stock.getStock() != null ? stock.getStock() : 0;
            int availableStock = stock != null && stock.getAvailableStock() != null ? stock.getAvailableStock() : currentStock;

            BigDecimal safetyStock = calculateSafetyStock(dailyAverage, safetyStockDays);
            BigDecimal suggestedQuantity = calculateSuggestedQuantity(forecastSales, availableStock, safetyStock);

            item.setHistoricalSalesQuantity(totalSales);
            item.setDailyAverageSales(dailyAverage);
            item.setForecastSalesQuantity(forecastSales);
            item.setCurrentStock(currentStock);
            item.setAvailableStock(availableStock);
            item.setSafetyStock(safetyStock.intValue());
            item.setSuggestedQuantity(suggestedQuantity);

            BigDecimal purchasePrice = product.getPrice().multiply(new BigDecimal("0.6")).setScale(2, RoundingMode.HALF_UP);
            item.setPurchasePrice(purchasePrice);
            item.setSuggestedAmount(suggestedQuantity.multiply(purchasePrice).setScale(2, RoundingMode.HALF_UP));

            item.setConfirmedQuantity(suggestedQuantity);
            item.setConfirmedAmount(item.getSuggestedAmount());

            if (suggestedQuantity.compareTo(BigDecimal.ZERO) > 0) {
                suggestionItems.add(item);
            }
        }

        suggestionItems.sort((a, b) -> b.getSuggestedQuantity().compareTo(a.getSuggestedQuantity()));

        log.info("采购建议计算完成, 共生成 {} 条建议", suggestionItems.size());
        return suggestionItems;
    }

    @Override
    public Map<String, Object> calculateHistoricalSales(LocalDate startDate, LocalDate endDate) {
        List<OrderItem> orderItems = getOrderItemsInRange(startDate, endDate);
        long actualDays = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        if (actualDays <= 0) actualDays = 1;

        BigDecimal totalQuantity = BigDecimal.ZERO;
        BigDecimal totalAmount = BigDecimal.ZERO;
        int itemCount = orderItems.size();

        for (OrderItem item : orderItems) {
            if (item.getQuantity() != null) {
                totalQuantity = totalQuantity.add(BigDecimal.valueOf(item.getQuantity()));
            }
            if (item.getTotalAmount() != null) {
                totalAmount = totalAmount.add(item.getTotalAmount());
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("startDate", startDate);
        result.put("endDate", endDate);
        result.put("days", actualDays);
        result.put("totalQuantity", totalQuantity);
        result.put("totalAmount", totalAmount);
        result.put("itemCount", itemCount);
        result.put("dailyAverageQuantity", totalQuantity.divide(BigDecimal.valueOf(actualDays), 4, RoundingMode.HALF_UP));
        result.put("dailyAverageAmount", totalAmount.divide(BigDecimal.valueOf(actualDays), 2, RoundingMode.HALF_UP));

        return result;
    }

    @Override
    public BigDecimal calculateSafetyStock(BigDecimal dailyAverage, Integer safetyStockDays) {
        if (dailyAverage == null || dailyAverage.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        int days = safetyStockDays != null && safetyStockDays > 0 ? safetyStockDays : 3;
        return dailyAverage.multiply(BigDecimal.valueOf(days)).setScale(2, RoundingMode.HALF_UP);
    }

    @Override
    public BigDecimal calculateSuggestedQuantity(BigDecimal forecastDemand, Integer availableStock, BigDecimal safetyStock) {
        BigDecimal available = availableStock != null ? BigDecimal.valueOf(availableStock) : BigDecimal.ZERO;
        BigDecimal safety = safetyStock != null ? safetyStock : BigDecimal.ZERO;
        BigDecimal demand = forecastDemand != null ? forecastDemand : BigDecimal.ZERO;

        BigDecimal needed = demand.add(safety).subtract(available);
        if (needed.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        return needed.setScale(2, RoundingMode.HALF_UP);
    }

    private List<OrderItem> getOrderItemsInRange(LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(23, 59, 59);

        return orderItemService.list(new LambdaQueryWrapper<OrderItem>()
                .ge(OrderItem::getCreateTime, start)
                .le(OrderItem::getCreateTime, end)
                .isNotNull(OrderItem::getProductId));
    }
}
