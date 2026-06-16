package com.cashier.server.entity.order;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("electronic_invoice")
public class ElectronicInvoice extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String invoiceNo;

    private String invoiceCode;

    private String invoiceNumber;

    private Long orderId;

    private String orderNo;

    private Long shopId;

    private String shopName;

    private String shopTaxNo;

    private String buyerName;

    private String buyerTaxNo;

    private String buyerPhone;

    private String buyerEmail;

    private String buyerAddress;

    private String buyerBank;

    private BigDecimal totalAmount;

    private BigDecimal amount;

    private BigDecimal taxAmount;

    private BigDecimal taxRate;

    private Integer invoiceType;

    private Integer invoiceTitleType;

    private Integer invoiceStatus;

    private String remark;

    private String qrcodeToken;

    private String qrcodeContent;

    private String qrcodeUrl;

    private String invoicePdfUrl;

    private byte[] invoicePdfBlob;

    private String taxControlSerialNo;

    private String taxControlRequestId;

    private LocalDateTime taxControlTime;

    private Integer taxControlStatus;

    private String taxControlError;

    private Integer taxControlAttempts;

    private Integer pushStatus;

    private LocalDateTime pushTime;

    private String pushError;

    private Integer pushAttempts;

    private Integer syncStatus;

    private Integer syncAttempts;

    private String syncError;

    private LocalDateTime syncTime;

    private Integer scannedCount;

    private LocalDateTime lastScannedTime;

    private Long cashierId;

    private String cashierName;
}
