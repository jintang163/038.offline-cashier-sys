package com.cashier.server.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class OrderPaymentSyncDTO {

    @JsonProperty("payment_no")
    private String paymentNo;

    @JsonProperty("pay_type")
    private String payType;

    @JsonProperty("pay_amount")
    private BigDecimal payAmount;

    @JsonProperty("pay_status")
    private Integer payStatus;

    @JsonProperty("pay_time")
    private LocalDateTime payTime;

    @JsonProperty("transaction_id")
    private String transactionId;
}
