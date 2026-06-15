package com.cashier.server.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductSyncDTO {

    @JsonProperty("id")
    private Long id;

    @JsonProperty("erp_goods_id")
    private String erpGoodsId;

    @JsonProperty("product_name")
    private String productName;

    @JsonProperty("category_id")
    private Long categoryId;

    @JsonProperty("category_name")
    private String categoryName;

    @JsonProperty("barcode")
    private String barcode;

    @JsonProperty("price")
    private BigDecimal price;

    @JsonProperty("original_price")
    private BigDecimal originalPrice;

    @JsonProperty("unit")
    private String unit;

    @JsonProperty("image")
    private String image;

    @JsonProperty("description")
    private String description;

    @JsonProperty("stock")
    private Integer stock;

    @JsonProperty("status")
    private Integer status;

    @JsonProperty("sort")
    private Integer sort;
}
