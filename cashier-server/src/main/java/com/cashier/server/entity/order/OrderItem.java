package com.cashier.server.entity.order;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("order_item")
public class OrderItem extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private Long orderId;

    private String orderNo;

    private Long productId;

    private String erpGoodsId;

    private String productName;

    private String image;

    private BigDecimal price;

    private Integer quantity;

    private BigDecimal totalAmount;

    private BigDecimal discountAmount;

    private BigDecimal payAmount;
}
