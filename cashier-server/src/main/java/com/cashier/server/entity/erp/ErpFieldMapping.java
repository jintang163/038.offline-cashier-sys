package com.cashier.server.entity.erp;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("erp_field_mapping")
public class ErpFieldMapping extends BaseEntity {

    private Long interfaceMappingId;

    private String mappingDirection;

    private String localField;

    private String localFieldType;

    private String erpField;

    private String erpFieldType;

    private Integer isRequired;

    private String defaultValue;

    private String transformExpression;

    private Integer sort;

    private Integer status;

    private String remark;
}
