package com.cashier.server.entity.stock;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("stock_check_task")
public class StockCheckTask extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String taskNo;

    private String taskName;

    private Integer taskType;

    private Integer checkMode;

    private Long shopId;

    private String shopName;

    private Long categoryId;

    private String categoryName;

    private LocalDateTime planStartTime;

    private LocalDateTime planEndTime;

    private LocalDateTime actualStartTime;

    private LocalDateTime actualEndTime;

    private Long operatorId;

    private String operatorName;

    private Integer taskStatus;

    private Integer syncStatus;

    private String erpTaskId;

    private String remark;
}
