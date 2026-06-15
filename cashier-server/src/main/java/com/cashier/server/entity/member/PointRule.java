package com.cashier.server.entity.member;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("point_rule")
public class PointRule extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String ruleCode;

    private String ruleName;

    private Integer ruleType;

    private BigDecimal ruleValue;

    private BigDecimal minAmount;

    private BigDecimal maxAmount;

    private String applicableLevels;

    private String excludeProducts;

    private String excludeCategories;

    private LocalDateTime startDate;

    private LocalDateTime endDate;

    private Integer priority;

    private Integer stackable;

    private Integer status;

    private String remark;
}
