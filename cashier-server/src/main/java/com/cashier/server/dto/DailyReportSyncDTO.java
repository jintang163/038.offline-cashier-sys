package com.cashier.server.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class DailyReportSyncDTO {

    @JsonProperty("report_no")
    private String reportNo;

    @JsonProperty("report_date")
    private LocalDate reportDate;

    @JsonProperty("shop_id")
    private Long shopId;

    @JsonProperty("shop_name")
    private String shopName;

    @JsonProperty("total_orders")
    private Integer totalOrders;

    @JsonProperty("total_amount")
    private BigDecimal totalAmount;

    @JsonProperty("discount_amount")
    private BigDecimal discountAmount;

    @JsonProperty("refund_amount")
    private BigDecimal refundAmount;

    @JsonProperty("actual_amount")
    private BigDecimal actualAmount;

    @JsonProperty("cash_amount")
    private BigDecimal cashAmount;

    @JsonProperty("wechat_amount")
    private BigDecimal wechatAmount;

    @JsonProperty("alipay_amount")
    private BigDecimal alipayAmount;

    @JsonProperty("member_card_amount")
    private BigDecimal memberCardAmount;

    @JsonProperty("other_pay_amount")
    private BigDecimal otherPayAmount;

    @JsonProperty("member_discount_amount")
    private BigDecimal memberDiscountAmount;

    @JsonProperty("points_deduction_amount")
    private BigDecimal pointsDeductionAmount;

    @JsonProperty("total_items")
    private Integer totalItems;

    @JsonProperty("avg_order_amount")
    private BigDecimal avgOrderAmount;

    @JsonProperty("new_member_count")
    private Integer newMemberCount;

    @JsonProperty("cashier_id")
    private Long cashierId;

    @JsonProperty("cashier_name")
    private String cashierName;

    @JsonProperty("report_status")
    private Integer reportStatus;

    @JsonProperty("sync_status")
    private Integer syncStatus;

    @JsonProperty("sync_attempts")
    private Integer syncAttempts;

    @JsonProperty("sync_error")
    private String syncError;

    @JsonProperty("erp_push_status")
    private Integer erpPushStatus;

    @JsonProperty("erp_push_time")
    private LocalDateTime erpPushTime;

    @JsonProperty("erp_push_error")
    private String erpPushError;

    @JsonProperty("sync_time")
    private LocalDateTime syncTime;

    @JsonProperty("remark")
    private String remark;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @JsonProperty("updated_at")
    private LocalDateTime updatedAt;
}
