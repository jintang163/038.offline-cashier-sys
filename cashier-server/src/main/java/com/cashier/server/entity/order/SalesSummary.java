package com.cashier.server.entity.order;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sales_summary")
public class SalesSummary extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private Long storeId;

    private String storeCode;

    private String erpGoodsId;

    private String productName;

    private Integer quantity;

    private BigDecimal totalAmount;

    private LocalDate orderDate;

    private Integer syncStatus;

    private Integer syncAttempts;

    private String syncError;
}
