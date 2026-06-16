package com.cashier.server.dto.stock;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class StockCheckRecordDTO {

    @JsonProperty("id")
    private Long id;

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

    @JsonProperty("barcode")
    private String barcode;

    @JsonProperty("scan_quantity")
    private Integer scanQuantity;

    @JsonProperty("input_quantity")
    private Integer inputQuantity;

    @JsonProperty("operator_id")
    private Long operatorId;

    @JsonProperty("operator_name")
    private String operatorName;

    @JsonProperty("scan_time")
    private LocalDateTime scanTime;

    @JsonProperty("device_id")
    private String deviceId;

    @JsonProperty("remark")
    private String remark;

    @JsonProperty("is_deleted")
    private Integer isDeleted;

    @JsonProperty("create_time")
    private LocalDateTime createTime;

    @JsonProperty("update_time")
    private LocalDateTime updateTime;
}
