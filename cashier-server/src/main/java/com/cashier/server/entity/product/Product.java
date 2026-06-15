package com.cashier.server.entity.product;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("product")
public class Product extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String erpGoodsId;

    private String productName;

    private Long categoryId;

    private String categoryName;

    private BigDecimal price;

    private BigDecimal originalPrice;

    private String unit;

    private String image;

    private String description;

    private Integer stock;

    private Integer status;

    private Integer sort;
}
