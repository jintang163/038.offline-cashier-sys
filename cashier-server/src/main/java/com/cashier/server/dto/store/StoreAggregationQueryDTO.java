package com.cashier.server.dto.store;

import lombok.Data;

@Data
public class StoreAggregationQueryDTO {
    private Long storeId;
    private String storeCode;
    private String dataType;
    private String aggregationDateStart;
    private String aggregationDateEnd;
    private Integer erpPushStatus;
    private Integer status;
    private Integer page;
    private Integer size;
}
