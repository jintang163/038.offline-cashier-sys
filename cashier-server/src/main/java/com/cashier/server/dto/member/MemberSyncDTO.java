package com.cashier.server.dto.member;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class MemberSyncDTO {

    private Long id;

    private String erpMemberId;

    private String phone;

    private String cardNo;

    private String memberName;

    private Long levelId;

    private String levelName;

    private BigDecimal discountRate;

    private Integer points;

    private Integer totalPoints;

    private BigDecimal balance;

    private Integer status;

    private LocalDateTime lastUsedTime;

    private LocalDateTime updateTime;

    private LocalDate birthday;

    private Integer gender;
}
