package com.cashier.server.entity.member;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("member_card")
public class MemberCard extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String erpCardId;

    private String cardNo;

    private Long memberId;

    private Integer cardType;

    private String cardName;

    private BigDecimal balance;

    private BigDecimal reservedBalance;

    private BigDecimal creditLimit;

    private BigDecimal usedCredit;

    private BigDecimal initialBalance;

    private BigDecimal totalRecharge;

    private BigDecimal totalConsume;

    private LocalDate validStartDate;

    private LocalDate validEndDate;

    private LocalDateTime issueTime;

    private Long issueStore;

    private String password;

    private Integer status;

    private LocalDateTime lastUsedTime;

    private LocalDateTime lastSyncTime;
}
