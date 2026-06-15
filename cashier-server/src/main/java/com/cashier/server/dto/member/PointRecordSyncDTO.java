package com.cashier.server.dto.member;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class PointRecordSyncDTO {

    private String recordNo;

    private Long memberId;

    private String phone;

    private Integer changeType;

    private Integer changePoints;

    private Integer beforePoints;

    private Integer afterPoints;

    private String orderNo;

    private Integer sourceType;

    private String remark;

    private Long cashierId;

    private String cashierName;

    @JsonProperty("created_at")
    private java.time.LocalDateTime createTime;

    private Integer syncAttempts;

    private String syncError;
}
