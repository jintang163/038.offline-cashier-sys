package com.cashier.server.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class OrderSyncDTO {

    @JsonProperty("order_no")
    private String orderNo;

    @JsonProperty("total_amount")
    private BigDecimal totalAmount;

    @JsonProperty("discount_amount")
    private BigDecimal discountAmount;

    @JsonProperty("pay_amount")
    private BigDecimal payAmount;

    @JsonProperty("pay_type")
    private String payType;

    @JsonProperty("pay_status")
    private Integer payStatus;

    @JsonProperty("order_status")
    private Integer orderStatus;

    @JsonProperty("cashier_id")
    private Long cashierId;

    @JsonProperty("cashier_name")
    private String cashierName;

    @JsonProperty("member_id")
    private Long memberId;

    @JsonProperty("member_name")
    private String memberName;

    @JsonProperty("remark")
    private String remark;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @JsonProperty("items")
    private List<OrderItemSyncDTO> items;

    @JsonProperty("payments")
    private List<OrderPaymentSyncDTO> payments;

    @JsonProperty("erp_order_id")
    private String erpOrderId;

    @JsonProperty("sync_status")
    private Integer syncStatus;

    @JsonProperty("sync_attempts")
    private Integer syncAttempts;

    @JsonProperty("sync_error")
    private String syncError;
}
