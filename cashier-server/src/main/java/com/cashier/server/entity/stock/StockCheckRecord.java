package com.cashier.server.entity.stock;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("stock_check_record")
public class StockCheckRecord extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private Long taskId;

    private String taskNo;

    private Long itemId;

    private Long productId;

    private String erpGoodsId;

    private String barcode;

    private Integer scanQuantity;

    private Integer inputQuantity;

    private Long operatorId;

    private String operatorName;

    private LocalDateTime scanTime;

    private String deviceId;

    private String remark;
}
