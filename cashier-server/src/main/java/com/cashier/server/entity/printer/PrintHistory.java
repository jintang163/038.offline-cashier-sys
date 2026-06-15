package com.cashier.server.entity.printer;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("print_history")
public class PrintHistory extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private Long queueId;

    private Long orderId;

    private String orderNo;

    private Long printerId;

    private String printerCode;

    private Long categoryId;

    private Integer itemsCount;

    private Integer copies;

    private Integer printStatus;

    private LocalDateTime printTime;

    private String errorMessage;

    private Long cashierId;

    private String cashierName;
}
