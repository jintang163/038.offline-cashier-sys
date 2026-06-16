package com.cashier.server.entity.order;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("invoice_wallet")
public class InvoiceWallet extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String walletNo;

    private String customerIdentifier;

    private Integer customerType;

    private String customerName;

    private String customerPhone;

    private Long invoiceId;

    private String invoiceNo;

    private String invoiceCode;

    private String invoiceNumber;

    private LocalDateTime invoiceDate;

    private BigDecimal invoiceAmount;

    private String buyerName;

    private Long shopId;

    private String shopName;

    private Integer scanSource;

    private LocalDateTime scanTime;

    private String scanDeviceInfo;

    private Integer walletStatus;

    private Integer isRead;

    private Integer isFavorite;

    private String remark;

    private String tags;

    private Integer syncStatus;

    private LocalDateTime syncTime;
}
