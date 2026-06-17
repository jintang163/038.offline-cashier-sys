package com.cashier.server.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class RefundOrderItemSyncDTO {

    private Long id;

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
