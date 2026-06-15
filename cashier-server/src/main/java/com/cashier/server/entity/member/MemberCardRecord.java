package com.cashier.server.entity.member;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("member_card_record")
public class MemberCardRecord extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String recordNo;

    private Long cardId;

    private String cardNo;

    private Long memberId;

    private Integer tradeType;

    private BigDecimal tradeAmount;

    private BigDecimal beforeBalance;

    private BigDecimal afterBalance;

    private BigDecimal beforeReserved;

    private BigDecimal afterReserved;

    private String orderNo;

    private Long orderId;

    private String relatedRecordNo;

    private Long cashierId;

    private String cashierName;

    private Long storeId;

    private String remark;

    private Integer syncStatus;

    private Integer syncAttempts;

    private String syncError;
}
