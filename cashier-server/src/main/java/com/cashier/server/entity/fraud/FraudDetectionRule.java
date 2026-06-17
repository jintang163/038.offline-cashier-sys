package com.cashier.server.entity.fraud;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("fraud_detection_rule")
public class FraudDetectionRule extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String ruleCode;

    private String ruleName;

    private String ruleType;

    private BigDecimal thresholdValue;

    private String thresholdUnit;

    private Integer timeWindow;

    private Integer riskLevel;

    private Integer lockOperation;

    private Integer requireOnlineVerify;

    private Integer status;

    private String remark;
}
