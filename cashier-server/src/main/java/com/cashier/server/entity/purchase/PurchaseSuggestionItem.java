package com.cashier.server.entity.purchase;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("purchase_suggestion_item")
public class PurchaseSuggestionItem extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private Long suggestionId;

    private String suggestionNo;

    private Long productId;

    private String erpGoodsId;

    private String productName;

    private String categoryName;

    private String unit;

    private BigDecimal historicalSalesQuantity;

    private BigDecimal dailyAverageSales;

    private BigDecimal forecastSalesQuantity;

    private Integer currentStock;

    private Integer availableStock;

    private Integer safetyStock;

    private BigDecimal suggestedQuantity;

    private BigDecimal purchasePrice;

    private BigDecimal suggestedAmount;

    private BigDecimal confirmedQuantity;

    private BigDecimal confirmedAmount;

    private String remark;
}
