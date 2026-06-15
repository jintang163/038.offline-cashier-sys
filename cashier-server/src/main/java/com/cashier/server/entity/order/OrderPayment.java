package com.cashier.server.entity.order;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("order_payment")
public class OrderPayment extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private Long orderId;

    private String orderNo;

    private String paymentNo;

    private String erpPaymentId;

    private String payType;

    private BigDecimal payAmount;

    private Integer payStatus;

    private LocalDateTime payTime;

    private String transactionId;
}
