package com.cashier.server.dto.stock;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class StockCheckUploadDTO {

    @JsonProperty("task_id")
    private Long taskId;

    @JsonProperty("task_no")
    private String taskNo;

    @JsonProperty("actual_start_time")
    private LocalDateTime actualStartTime;

    @JsonProperty("actual_end_time")
    private LocalDateTime actualEndTime;

    @JsonProperty("operator_id")
    private Long operatorId;

    @JsonProperty("operator_name")
    private String operatorName;

    @JsonProperty("device_id")
    private String deviceId;

    @JsonProperty("items")
    private List<StockCheckItemDTO> items;

    @JsonProperty("records")
    private List<StockCheckRecordDTO> records;
}
