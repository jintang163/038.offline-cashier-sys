package com.cashier.server.entity.stock;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("stock_check_item")
public class StockCheckItem extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private Long taskId;

    private String taskNo;

    private Long productId;

    private String erpGoodsId;

    private String productName;

    private String categoryName;

    private String barcode;

    private String unit;

    private BigDecimal price;

    private Integer theoreticalStock;

    private Integer actualStock;

    private Integer diffQuantity;

    private BigDecimal diffAmount;

    private Integer checkStatus;

    private String remark;
}
