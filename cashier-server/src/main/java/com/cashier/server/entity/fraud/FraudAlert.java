package com.cashier.server.entity.fraud;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("fraud_alert")
public class FraudAlert extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String alertNo;

    private Long storeId;

    private String storeName;

    private Long deviceId;

    private String deviceNo;

    private String alertType;

    private Integer riskLevel;

    private String alertTitle;

    private String alertContent;

    @TableField(typeHandler = com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler.class)
    private String alertDetails;

    private String status;

    private Long assigneeId;

    private String assigneeName;

    private LocalDateTime resolveTime;

    private String resolveRemark;
}
