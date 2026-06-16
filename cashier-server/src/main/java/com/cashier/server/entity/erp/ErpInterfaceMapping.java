package com.cashier.server.entity.erp;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("erp_interface_mapping")
public class ErpInterfaceMapping extends BaseEntity {

    private Long configId;

    private String businessType;

    private String interfaceName;

    private String interfacePath;

    private String httpMethod;

    private String requestContentType;

    private String requestTemplate;

    private String responseDataPath;

    private String responseCodeField;

    private String responseSuccessCode;

    private String responseMessageField;

    private Integer pageEnabled;

    private String pageSizeParam;

    private String pageNumParam;

    private String syncDirection;

    private Integer status;

    private String remark;
}
