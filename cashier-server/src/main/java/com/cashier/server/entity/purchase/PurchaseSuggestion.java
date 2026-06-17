package com.cashier.server.entity.purchase;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("purchase_suggestion")
public class PurchaseSuggestion extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String suggestionNo;

    private String shopId;

    private String shopName;

    private LocalDate forecastStartDate;

    private LocalDate forecastEndDate;

    private Integer forecastDays;

    private Integer status;

    private String erpPurchaseSuggestionId;

    private String erpPurchaseOrderId;

    private BigDecimal totalSuggestedQuantity;

    private BigDecimal totalSuggestedAmount;

    private BigDecimal totalConfirmedQuantity;

    private BigDecimal totalConfirmedAmount;

    private String confirmRemark;

    private LocalDate confirmDate;

    private Long confirmUserId;

    private String confirmUserName;

    private Integer pushErpStatus;

    private String pushErpError;

    private Integer generateType;

    private String remark;
}
