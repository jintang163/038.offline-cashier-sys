package com.cashier.server.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class InvoiceQrcodeScanDTO {

    @JsonProperty("qrcode_token")
    private String qrcodeToken;

    @JsonProperty("customer_identifier")
    private String customerIdentifier;

    @JsonProperty("customer_type")
    private Integer customerType;

    @JsonProperty("customer_name")
    private String customerName;

    @JsonProperty("customer_phone")
    private String customerPhone;

    @JsonProperty("scan_source")
    private Integer scanSource;

    @JsonProperty("scan_device_info")
    private String scanDeviceInfo;

    @JsonProperty("tags")
    private String tags;

    @JsonProperty("remark")
    private String remark;
}
