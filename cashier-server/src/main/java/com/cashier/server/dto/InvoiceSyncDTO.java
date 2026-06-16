package com.cashier.server.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class InvoiceSyncDTO {

    @JsonProperty("invoice_no")
    private String invoiceNo;

    @JsonProperty("invoice_code")
    private String invoiceCode;

    @JsonProperty("invoice_number")
    private String invoiceNumber;

    @JsonProperty("order_id")
    private Long orderId;

    @JsonProperty("order_no")
    private String orderNo;

    @JsonProperty("shop_id")
    private Long shopId;

    @JsonProperty("shop_name")
    private String shopName;

    @JsonProperty("shop_tax_no")
    private String shopTaxNo;

    @JsonProperty("buyer_name")
    private String buyerName;

    @JsonProperty("buyer_tax_no")
    private String buyerTaxNo;

    @JsonProperty("buyer_phone")
    private String buyerPhone;

    @JsonProperty("buyer_email")
    private String buyerEmail;

    @JsonProperty("buyer_address")
    private String buyerAddress;

    @JsonProperty("buyer_bank")
    private String buyerBank;

    @JsonProperty("total_amount")
    private BigDecimal totalAmount;

    @JsonProperty("amount")
    private BigDecimal amount;

    @JsonProperty("tax_amount")
    private BigDecimal taxAmount;

    @JsonProperty("tax_rate")
    private BigDecimal taxRate;

    @JsonProperty("invoice_type")
    private Integer invoiceType;

    @JsonProperty("invoice_title_type")
    private Integer invoiceTitleType;

    @JsonProperty("invoice_status")
    private Integer invoiceStatus;

    @JsonProperty("remark")
    private String remark;

    @JsonProperty("qrcode_token")
    private String qrcodeToken;

    @JsonProperty("qrcode_content")
    private String qrcodeContent;

    @JsonProperty("qrcode_url")
    private String qrcodeUrl;

    @JsonProperty("invoice_pdf_url")
    private String invoicePdfUrl;

    @JsonProperty("tax_control_serial_no")
    private String taxControlSerialNo;

    @JsonProperty("tax_control_request_id")
    private String taxControlRequestId;

    @JsonProperty("tax_control_time")
    private LocalDateTime taxControlTime;

    @JsonProperty("tax_control_status")
    private Integer taxControlStatus;

    @JsonProperty("tax_control_error")
    private String taxControlError;

    @JsonProperty("tax_control_attempts")
    private Integer taxControlAttempts;

    @JsonProperty("push_status")
    private Integer pushStatus;

    @JsonProperty("push_time")
    private LocalDateTime pushTime;

    @JsonProperty("push_error")
    private String pushError;

    @JsonProperty("push_attempts")
    private Integer pushAttempts;

    @JsonProperty("sync_status")
    private Integer syncStatus;

    @JsonProperty("sync_attempts")
    private Integer syncAttempts;

    @JsonProperty("sync_error")
    private String syncError;

    @JsonProperty("sync_time")
    private LocalDateTime syncTime;

    @JsonProperty("scanned_count")
    private Integer scannedCount;

    @JsonProperty("last_scanned_time")
    private LocalDateTime lastScannedTime;

    @JsonProperty("cashier_id")
    private Long cashierId;

    @JsonProperty("cashier_name")
    private String cashierName;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @JsonProperty("updated_at")
    private LocalDateTime updatedAt;
}
