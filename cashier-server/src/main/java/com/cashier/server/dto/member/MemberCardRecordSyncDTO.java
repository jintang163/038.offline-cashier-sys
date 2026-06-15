package com.cashier.server.dto.member;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class MemberCardRecordSyncDTO {

    @JsonProperty("record_no")
    private String recordNo;

    @JsonProperty("card_id")
    private Long cardId;

    @JsonProperty("card_no")
    private String cardNo;

    @JsonProperty("member_id")
    private Long memberId;

    @JsonProperty("trade_type")
    private Integer tradeType;

    @JsonProperty("trade_amount")
    private BigDecimal tradeAmount;

    @JsonProperty("before_balance")
    private BigDecimal beforeBalance;

    @JsonProperty("after_balance")
    private BigDecimal afterBalance;

    @JsonProperty("before_reserved")
    private BigDecimal beforeReserved;

    @JsonProperty("after_reserved")
    private BigDecimal afterReserved;

    @JsonProperty("order_no")
    private String orderNo;

    @JsonProperty("order_id")
    private Long orderId;

    @JsonProperty("related_record_no")
    private String relatedRecordNo;

    @JsonProperty("cashier_id")
    private Long cashierId;

    @JsonProperty("cashier_name")
    private String cashierName;

    @JsonProperty("store_id")
    private Long storeId;

    @JsonProperty("remark")
    private String remark;

    @JsonProperty("sync_status")
    private Integer syncStatus;

    @JsonProperty("sync_attempts")
    private Integer syncAttempts;

    @JsonProperty("sync_error")
    private String syncError;

    @JsonProperty("created_at")
    private LocalDateTime createTime;
}
