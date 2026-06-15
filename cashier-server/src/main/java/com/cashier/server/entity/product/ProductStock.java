package com.cashier.server.entity.product;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("product_stock")
public class ProductStock extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private Long productId;

    private String erpGoodsId;

    private Integer stock;

    private Integer frozenStock;

    private Integer availableStock;
}
