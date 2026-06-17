package com.cashier.server.entity.system;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.entity.BaseEntity;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("device_self_check_log")
public class DeviceSelfCheckLog extends BaseEntity {

    private String checkNo;

    private Long deviceId;

    private String deviceNo;

    private String deviceName;

    private String checkType;

    private Integer checkStatus;

    private Integer networkStatus;

    private Integer networkLatency;

    private String networkSpeed;

    private Integer printerStatus;

    private String printerName;

    private String printerError;

    private Long storageTotal;

    private Long storageUsed;

    private Long storageFree;

    private BigDecimal storageUsageRate;

    private Integer storageStatus;

    private String errorDetails;

    private Integer isAlerted;

    private LocalDateTime alertTime;

    private Long operatorId;

    private String operatorName;

    private Integer handleStatus;

    private String handleRemark;

    private LocalDateTime handleTime;
}
