package com.cashier.server.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class DisasterRecoveryDataDTO {

    @JsonProperty("data_hours")
    private Integer dataHours;

    @JsonProperty("sync_time")
    private LocalDateTime syncTime;

    @JsonProperty("main_device_info")
    private MainDeviceInfo mainDeviceInfo;

    @JsonProperty("orders")
    private List<OrderRecoveryDTO> orders;

    @JsonProperty("products")
    private List<ProductRecoveryDTO> products;

    @JsonProperty("stocks")
    private List<StockRecoveryDTO> stocks;

    @JsonProperty("members")
    private List<MemberRecoveryDTO> members;

    @JsonProperty("refund_orders")
    private List<RefundRecoveryDTO> refundOrders;

    @JsonProperty("payments")
    private List<PaymentRecoveryDTO> payments;

    @Data
    public static class MainDeviceInfo {
        private Long deviceId;
        private String deviceNo;
        private String deviceName;
        private String ipAddress;
        private LocalDateTime lastHeartbeat;
    }

    @Data
    public static class OrderRecoveryDTO {
        private Long id;
        private String orderNo;
        private String erpOrderId;
        private Integer orderType;
        private BigDecimal orderAmount;
        private BigDecimal payAmount;
        private BigDecimal discountAmount;
        private Integer payStatus;
        private String payType;
        private String buyerName;
        private String buyerPhone;
        private Integer itemCount;
        private String itemsJson;
        private String remark;
        private Integer syncStatus;
        private LocalDateTime createTime;
    }

    @Data
    public static class ProductRecoveryDTO {
        private Long id;
        private String erpGoodsId;
        private String productName;
        private String barcode;
        private String spec;
        private String categoryId;
        private String categoryName;
        private BigDecimal price;
        private BigDecimal memberPrice;
        private String image;
        private String unit;
        private Integer status;
        private LocalDateTime updateTime;
    }

    @Data
    public static class StockRecoveryDTO {
        private Long id;
        private Long productId;
        private String erpGoodsId;
        private String productName;
        private BigDecimal stock;
        private BigDecimal frozenStock;
        private BigDecimal warningStock;
        private LocalDateTime updateTime;
    }

    @Data
    public static class MemberRecoveryDTO {
        private Long id;
        private String memberNo;
        private String name;
        private String phone;
        private Integer level;
        private String levelName;
        private BigDecimal balance;
        private Integer points;
        private BigDecimal totalConsume;
        private Integer status;
        private LocalDateTime updateTime;
    }

    @Data
    public static class RefundRecoveryDTO {
        private Long id;
        private String refundNo;
        private Long orderId;
        private String orderNo;
        private Integer refundType;
        private BigDecimal refundAmount;
        private Integer auditStatus;
        private String refundReason;
        private String itemsJson;
        private Integer syncStatus;
        private LocalDateTime createTime;
    }

    @Data
    public static class PaymentRecoveryDTO {
        private Long id;
        private Long orderId;
        private String orderNo;
        private String payMethod;
        private BigDecimal payAmount;
        private String transactionId;
        private Integer payStatus;
        private LocalDateTime payTime;
    }
}
