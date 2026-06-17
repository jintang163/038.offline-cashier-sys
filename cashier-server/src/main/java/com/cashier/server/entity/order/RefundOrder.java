package com.cashier.server.entity.order;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("refund_order")
public class RefundOrder extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private Long storeId;

    private String storeCode;

    private String refundNo;

    private String erpRefundId;

    private Long orderId;

    private String orderNo;

    private String erpOrderId;

    private Integer refundType;

    private BigDecimal refundAmount;

    private BigDecimal originalPayAmount;

    private String refundReason;

    private Integer auditStatus;

    private Long auditorId;

    private String auditorName;

    private LocalDateTime auditTime;

    private String auditRemark;

    private Integer syncStatus;

    private Integer syncAttempts;

    private String syncErrorMessage;

    private LocalDateTime syncTime;

    private Integer erpPushStatus;

    private String erpPushError;

    private LocalDateTime erpPushTime;

    private Long cashierId;

    private String cashierName;

    private Long managerId;

    private String managerName;

    private String remark;
}
