package com.cashier.server.entity.system;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.entity.BaseEntity;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("cashier_device")
public class CashierDevice extends BaseEntity {

    private String deviceNo;

    private String deviceName;

    private String deviceType;

    private String deviceModel;

    private String osType;

    private String osVersion;

    private String appVersion;

    private String ipAddress;

    private String macAddress;

    private String location;

    private Integer deviceStatus;

    private LocalDateTime lastHeartbeat;

    private LocalDateTime lastLoginTime;

    private Long lastLoginUserId;

    private String lastLoginUserName;

    private Integer isActive;

    private Integer isMainDevice;

    private String remark;

    private Integer syncStatus;

    private LocalDateTime syncTime;
}
