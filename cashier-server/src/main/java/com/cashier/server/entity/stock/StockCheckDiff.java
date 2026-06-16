package com.cashier.server.entity.stock;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("stock_check_diff")
public class StockCheckDiff extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String diffNo;

    private Long taskId;

    private String taskNo;

    private Long itemId;

    private Long productId;

    private String erpGoodsId;

    private String productName;

    private String categoryName;

    private String unit;

    private BigDecimal price;

    private Integer theoreticalStock;

    private Integer actualStock;

    private Integer diffQuantity;

    private BigDecimal diffAmount;

    private Integer diffType;

    private Integer handleType;

    private String handleNo;

    private LocalDateTime handleTime;

    private Integer handleStatus;

    private String operatorName;

    private String remark;
}
