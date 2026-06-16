package com.cashier.server.dto.stock;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class StockCheckTaskDTO {

    @JsonProperty("id")
    private Long id;

    @JsonProperty("task_no")
    private String taskNo;

    @JsonProperty("task_name")
    private String taskName;

    @JsonProperty("task_type")
    private Integer taskType;

    @JsonProperty("check_mode")
    private Integer checkMode;

    @JsonProperty("shop_id")
    private Long shopId;

    @JsonProperty("shop_name")
    private String shopName;

    @JsonProperty("category_id")
    private Long categoryId;

    @JsonProperty("category_name")
    private String categoryName;

    @JsonProperty("plan_start_time")
    private LocalDateTime planStartTime;

    @JsonProperty("plan_end_time")
    private LocalDateTime planEndTime;

    @JsonProperty("actual_start_time")
    private LocalDateTime actualStartTime;

    @JsonProperty("actual_end_time")
    private LocalDateTime actualEndTime;

    @JsonProperty("operator_id")
    private Long operatorId;

    @JsonProperty("operator_name")
    private String operatorName;

    @JsonProperty("task_status")
    private Integer taskStatus;

    @JsonProperty("sync_status")
    private Integer syncStatus;

    @JsonProperty("erp_task_id")
    private String erpTaskId;

    @JsonProperty("remark")
    private String remark;

    @JsonProperty("items")
    private List<StockCheckItemDTO> items;

    @JsonProperty("product_ids")
    private List<Long> productIds;
}
