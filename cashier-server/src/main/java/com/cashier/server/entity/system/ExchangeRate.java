package com.cashier.server.entity.system;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("exchange_rate")
public class ExchangeRate extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String currencyCode;

    private String currencyName;

    private String currencySymbol;

    private BigDecimal rateToCny;

    private BigDecimal rateFromCny;

    private LocalDateTime rateTime;

    private String source;

    @TableField("is_enabled")
    private Integer isEnabled;
}
