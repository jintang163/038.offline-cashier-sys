package com.cashier.server.entity.product;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("product_category")
public class ProductCategory extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String erpCategoryId;

    private String categoryName;

    private Integer sort;

    private Integer status;
}
