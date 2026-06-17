package com.cashier.server.entity.system;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.entity.BaseEntity;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("disaster_recovery_token")
public class DisasterRecoveryToken extends BaseEntity {

    private String token;

    private Long shopId;

    private String shopName;

    private Long mainDeviceId;

    private String mainDeviceNo;

    private String mainDeviceName;

    private String mainDeviceIp;

    private Long operatorId;

    private String operatorName;

    private LocalDateTime expireTime;

    private Integer tokenStatus;

    private LocalDateTime usedTime;

    private Long usedDeviceId;

    private String usedDeviceNo;

    private Long backupUserId;

    private String backupUserName;

    private Integer dataSyncStatus;

    private LocalDateTime dataSyncTime;

    private Integer dataHours;

    private String syncScope;

    private String remark;
}
