package com.cashier.server.entity.member;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("member_level")
public class MemberLevel extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String erpLevelId;

    private String levelCode;

    private String levelName;

    private Integer minPoints;

    private Integer maxPoints;

    private BigDecimal discountRate;

    private BigDecimal pointRate;

    private Integer sortOrder;

    private Integer status;
}
