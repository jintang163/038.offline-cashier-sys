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
@TableName("point_record")
public class PointRecord extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String recordNo;

    private Long memberId;

    private String phone;

    private Integer changeType;

    private Integer changePoints;

    private Integer beforePoints;

    private Integer afterPoints;

    private String orderNo;

    private Long orderId;

    private Integer sourceType;

    private Long ruleId;

    private BigDecimal relatedAmount;

    private Long cashierId;

    private String cashierName;

    private Long storeId;

    private String remark;

    private Integer syncStatus;

    private Integer syncAttempts;

    private String syncError;

    private LocalDateTime syncTime;

    private LocalDate expiredDate;
}
