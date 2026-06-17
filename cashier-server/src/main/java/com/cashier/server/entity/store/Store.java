package com.cashier.server.entity.store;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("store")
public class Store extends BaseEntity {
    private static final long serialVersionUID = 1L;
    private String storeCode;
    private String storeName;
    private Integer storeType;
    private String province;
    private String city;
    private String district;
    private String address;
    private String contactPhone;
    private String contactName;
    private String businessHours;
    private BigDecimal longitude;
    private BigDecimal latitude;
    private Integer erpConfigMode;
    private Long erpConfigId;
    private Integer status;
    private Integer isHeadquarters;
    private Long parentStoreId;
    private String remark;
}
