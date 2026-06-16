package com.cashier.server.entity.erp;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("erp_product_sync_strategy")
public class ErpProductSyncStrategy extends BaseEntity {

    private Long configId;

    private String strategyName;

    private String fullSyncCron;

    private Integer fullSyncEnabled;

    private String incrementalSyncCron;

    private Integer incrementalSyncEnabled;

    private String incrementalFields;

    private LocalDateTime lastFullSyncTime;

    private LocalDateTime lastIncrementalSyncTime;

    private String syncTimeField;

    private Integer pageSize;

    private Integer enableStockSync;

    private Integer enablePriceSync;

    private Integer enableCategorySync;

    private Integer status;

    private String remark;
}
