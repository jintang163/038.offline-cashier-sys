package com.cashier.server.dto.stock;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class StockCheckItemDTO {

    @JsonProperty("id")
    private Long id;

    @JsonProperty("task_id")
    private Long taskId;

    @JsonProperty("task_no")
    private String taskNo;

    @JsonProperty("product_id")
    private Long productId;

    @JsonProperty("erp_goods_id")
    private String erpGoodsId;

    @JsonProperty("product_name")
    private String productName;

    @JsonProperty("category_name")
    private String categoryName;

    @JsonProperty("barcode")
    private String barcode;

    @JsonProperty("unit")
    private String unit;

    @JsonProperty("price")
    private BigDecimal price;

    @JsonProperty("theoretical_stock")
    private Integer theoreticalStock;

    @JsonProperty("actual_stock")
    private Integer actualStock;

    @JsonProperty("diff_quantity")
    private Integer diffQuantity;

    @JsonProperty("diff_amount")
    private BigDecimal diffAmount;

    @JsonProperty("check_status")
    private Integer checkStatus;

    @JsonProperty("remark")
    private String remark;
}
