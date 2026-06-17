package com.cashier.server.entity.system;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.entity.BaseEntity;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("device_log_upload")
public class DeviceLogUpload extends BaseEntity {

    private String uploadNo;

    private Long deviceId;

    private String deviceNo;

    private String deviceName;

    private LocalDate logDate;

    private String logType;

    private String fileName;

    private String filePath;

    private Long fileSize;

    private String fileMd5;

    private Integer uploadStatus;

    private Integer uploadAttempts;

    private String uploadError;

    private LocalDateTime uploadTime;

    private Long operatorId;

    private String operatorName;

    private LocalDateTime pullRequestTime;

    private Integer pullStatus;

    private String pullRemark;
}
