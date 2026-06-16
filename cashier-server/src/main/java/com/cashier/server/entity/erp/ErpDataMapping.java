package com.cashier.server.entity.erp;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("erp_data_mapping")
public class ErpDataMapping extends BaseEntity {

    private Long configId;

    private String mappingType;

    private String mappingCode;

    private String mappingName;

    private String erpCode;

    private String erpName;

    private Integer sort;

    private Integer status;

    private String remark;
}
