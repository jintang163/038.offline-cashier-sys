package com.cashier.server.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class InvoiceWalletSyncDTO {

    @JsonProperty("wallet_no")
    private String walletNo;

    @JsonProperty("customer_identifier")
    private String customerIdentifier;

    @JsonProperty("customer_type")
    private Integer customerType;

    @JsonProperty("customer_name")
    private String customerName;

    @JsonProperty("customer_phone")
    private String customerPhone;

    @JsonProperty("invoice_id")
    private Long invoiceId;

    @JsonProperty("invoice_no")
    private String invoiceNo;

    @JsonProperty("invoice_code")
    private String invoiceCode;

    @JsonProperty("invoice_number")
    private String invoiceNumber;

    @JsonProperty("invoice_date")
    private LocalDateTime invoiceDate;

    @JsonProperty("invoice_amount")
    private BigDecimal invoiceAmount;

    @JsonProperty("buyer_name")
    private String buyerName;

    @JsonProperty("shop_id")
    private Long shopId;

    @JsonProperty("shop_name")
    private String shopName;

    @JsonProperty("scan_source")
    private Integer scanSource;

    @JsonProperty("scan_time")
    private LocalDateTime scanTime;

    @JsonProperty("scan_device_info")
    private String scanDeviceInfo;

    @JsonProperty("wallet_status")
    private Integer walletStatus;

    @JsonProperty("is_read")
    private Integer isRead;

    @JsonProperty("is_favorite")
    private Integer isFavorite;

    @JsonProperty("remark")
    private String remark;

    @JsonProperty("tags")
    private String tags;

    @JsonProperty("sync_status")
    private Integer syncStatus;

    @JsonProperty("sync_time")
    private LocalDateTime syncTime;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @JsonProperty("updated_at")
    private LocalDateTime updatedAt;
}
