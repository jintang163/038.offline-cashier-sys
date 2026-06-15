package com.cashier.server.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class OrderItemSyncDTO {

    @JsonProperty("product_id")
    private Long productId;

    @JsonProperty("erp_goods_id")
    private String erpGoodsId;

    @JsonProperty("product_name")
    private String productName;

    @JsonProperty("barcode")
    private String barcode;

    @JsonProperty("image")
    private String image;

    @JsonProperty("price")
    private BigDecimal price;

    @JsonProperty("quantity")
    private Integer quantity;

    @JsonProperty("subtotal")
    private BigDecimal subtotal;

    @JsonProperty("total_amount")
    private BigDecimal totalAmount;

    @JsonProperty("discount_amount")
    private BigDecimal discountAmount;

    @JsonProperty("pay_amount")
    private BigDecimal payAmount;
}
