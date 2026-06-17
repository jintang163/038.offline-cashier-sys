package com.cashier.server.entity.fraud;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("operation_lock_log")
public class OperationLockLog extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String lockNo;

    private Long storeId;

    private String storeName;

    private Long deviceId;

    private String deviceNo;

    private Long cashierId;

    private String cashierName;

    private String operationType;

    private String triggerRule;

    private Integer riskLevel;

    private String lockReason;

    @TableField(typeHandler = com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler.class)
    private String lockDetails;

    private Integer isOffline;

    private Integer verifyStatus;

    private Long verifyUserId;

    private String verifyUserName;

    private LocalDateTime verifyTime;

    private String verifyRemark;

    private Integer syncStatus;

    private LocalDateTime syncTime;
}
