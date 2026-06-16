package com.cashier.server.dto.stock;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class StockCheckDiffDTO {

    @JsonProperty("id")
    private Long id;

    @JsonProperty("diff_no")
    private String diffNo;

    @JsonProperty("task_id")
    private Long taskId;

    @JsonProperty("task_no")
    private String taskNo;

    @JsonProperty("item_id")
    private Long itemId;

    @JsonProperty("product_id")
    private Long productId;

    @JsonProperty("erp_goods_id")
    private String erpGoodsId;

    @JsonProperty("product_name")
    private String productName;

    @JsonProperty("category_name")
    private String categoryName;

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

    @JsonProperty("diff_type")
    private Integer diffType;

    @JsonProperty("handle_type")
    private Integer handleType;

    @JsonProperty("handle_no")
    private String handleNo;

    @JsonProperty("handle_time")
    private LocalDateTime handleTime;

    @JsonProperty("handle_status")
    private Integer handleStatus;

    @JsonProperty("operator_name")
    private String operatorName;

    @JsonProperty("remark")
    private String remark;
}
