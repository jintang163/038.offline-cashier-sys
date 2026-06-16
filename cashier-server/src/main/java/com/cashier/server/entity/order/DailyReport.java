package com.cashier.server.entity.order;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("daily_report")
public class DailyReport extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String reportNo;

    private LocalDate reportDate;

    private Long shopId;

    private String shopName;

    private Integer totalOrders;

    private BigDecimal totalAmount;

    private BigDecimal discountAmount;

    private BigDecimal refundAmount;

    private BigDecimal actualAmount;

    private BigDecimal cashAmount;

    private BigDecimal wechatAmount;

    private BigDecimal alipayAmount;

    private BigDecimal memberCardAmount;

    private BigDecimal otherPayAmount;

    private BigDecimal memberDiscountAmount;

    private BigDecimal pointsDeductionAmount;

    private Integer totalItems;

    private BigDecimal avgOrderAmount;

    private Integer newMemberCount;

    private Long cashierId;

    private String cashierName;

    private Integer reportStatus;

    private Integer syncStatus;

    private Integer syncAttempts;

    private String syncError;

    private LocalDateTime syncTime;

    private Integer erpPushStatus;

    private LocalDateTime erpPushTime;

    private String erpPushError;

    private String remark;
}
