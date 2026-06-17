package com.cashier.server.entity.store;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("store_aggregation_data")
public class StoreAggregationData extends BaseEntity {
    private static final long serialVersionUID = 1L;
    private String aggregationNo;
    private Long storeId;
    private String storeCode;
    private String storeName;
    private String dataType;
    private LocalDate aggregationDate;
    private LocalDateTime aggregationStartTime;
    private LocalDateTime aggregationEndTime;
    private Integer recordCount;
    private BigDecimal totalAmount;
    private String summaryData;
    private String detailIds;
    private Integer erpPushStatus;
    private LocalDateTime erpPushTime;
    private String erpPushError;
    private Integer erpPushAttempts;
    private String erpBatchNo;
    private Integer status;
    private String remark;
}
