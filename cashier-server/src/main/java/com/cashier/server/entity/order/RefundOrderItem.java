package com.cashier.server.entity.order;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("refund_order_item")
public class RefundOrderItem extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private Long storeId;

    private Long refundOrderId;

    private String refundNo;

    private Long orderItemId;

    private Long productId;

    private String erpGoodsId;

    private String productName;

    private String barcode;

    private String image;

    private BigDecimal price;

    private Integer originalQuantity;

    private Integer refundQuantity;

    private BigDecimal originalAmount;

    private BigDecimal refundAmount;

    private BigDecimal discountAmount;

    private String remark;
}
