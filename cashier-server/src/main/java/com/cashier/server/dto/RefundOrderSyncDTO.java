package com.cashier.server.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class RefundOrderSyncDTO {

    private Long id;

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

    private LocalDateTime createTime;

    private List<RefundOrderItemSyncDTO> items;
}
