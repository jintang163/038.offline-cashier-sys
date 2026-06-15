package com.cashier.server.dto.member;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class CardReserveDTO {

    private Long cardId;

    private BigDecimal amount;

    private String orderNo;
}
