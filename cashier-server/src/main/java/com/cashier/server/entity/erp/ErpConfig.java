package com.cashier.server.entity.erp;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("erp_config")
public class ErpConfig extends BaseEntity {

    private String configCode;

    private String configName;

    private String erpType;

    private String baseUrl;

    private String authType;

    private String appKey;

    private String appSecret;

    private String token;

    private LocalDateTime tokenExpireTime;

    private String username;

    private String password;

    private Integer timeout;

    private Integer retryTimes;

    private Integer retryInterval;

    private String middleTableConfig;

    private Integer isDefault;

    private Integer status;

    private String remark;
}
