package com.cashier.server.dto.member;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class CardPayDTO {

    private Long cardId;

    private Long memberId;

    private BigDecimal amount;

    private String orderNo;

    private String password;
}
