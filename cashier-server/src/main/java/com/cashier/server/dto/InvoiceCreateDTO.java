package com.cashier.server.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class InvoiceCreateDTO {

    @JsonProperty("order_id")
    private Long orderId;

    @JsonProperty("order_no")
    private String orderNo;

    @JsonProperty("shop_id")
    private Long shopId;

    @JsonProperty("shop_name")
    private String shopName;

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

    @JsonProperty("invoice_type")
    private Integer invoiceType;

    @JsonProperty("invoice_title_type")
    private Integer invoiceTitleType;

    @JsonProperty("tax_rate")
    private BigDecimal taxRate;

    @JsonProperty("remark")
    private String remark;

    @JsonProperty("cashier_id")
    private Long cashierId;

    @JsonProperty("cashier_name")
    private String cashierName;
}
