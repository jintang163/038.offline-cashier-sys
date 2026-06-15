package com.cashier.server.entity.printer;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("print_rule")
public class PrintRule extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String ruleCode;

    private String ruleName;

    private Long categoryId;

    private String categoryName;

    private Long printerId;

    private String printerCode;

    private Integer copies;

    private Integer priority;

    private Integer sort;

    private Integer status;
}
