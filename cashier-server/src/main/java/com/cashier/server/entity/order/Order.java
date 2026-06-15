package com.cashier.server.entity.order;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("order_info")
public class Order extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String orderNo;

    private String erpOrderId;

    private BigDecimal totalAmount;

    private BigDecimal discountAmount;

    private BigDecimal payAmount;

    private Integer payStatus;

    private Integer orderStatus;

    private Integer syncStatus;

    private Integer syncAttempts;

    private String syncErrorMessage;

    private Long cashierId;

    private String cashierName;

    private String remark;
}
