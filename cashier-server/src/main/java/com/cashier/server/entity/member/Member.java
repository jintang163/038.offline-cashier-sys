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
@TableName("member")
public class Member extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String erpMemberId;

    private String phone;

    private String cardNo;

    private String memberName;

    private String nickname;

    private String avatar;

    private Integer gender;

    private LocalDate birthday;

    private String email;

    private String address;

    private Long levelId;

    private String levelName;

    private BigDecimal discountRate;

    private Integer points;

    private Integer totalPoints;

    private BigDecimal balance;

    private BigDecimal totalRecharge;

    private BigDecimal totalConsume;

    private Integer totalOrders;

    private LocalDateTime registerTime;

    private Long registerStore;

    private Integer sourceType;

    private Integer status;

    private String remark;

    private LocalDateTime lastUsedTime;
}
