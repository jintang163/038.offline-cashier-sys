package com.cashier.server.entity.fraud;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("suspicious_store")
public class SuspiciousStore extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private Long storeId;

    private String storeName;

    private Integer riskScore;

    private String riskLevel;

    private Integer detectionCount;

    private LocalDateTime lastDetectionTime;

    private String status;

    private Long handlerId;

    private String handlerName;

    private LocalDateTime handleTime;

    private String handleRemark;
}
