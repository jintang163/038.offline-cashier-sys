package com.cashier.server.entity.erp;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("erp_sync_task")
public class ErpSyncTask extends BaseEntity {

    private Long configId;

    private String taskCode;

    private String taskName;

    private String businessType;

    private String syncDirection;

    private String cronExpression;

    private Integer executeInterval;

    private String taskParams;

    private Integer pageSize;

    private Integer enabled;

    private LocalDateTime lastExecuteTime;

    private Integer lastExecuteStatus;

    private String lastExecuteResult;

    private Integer status;

    private String remark;
}
