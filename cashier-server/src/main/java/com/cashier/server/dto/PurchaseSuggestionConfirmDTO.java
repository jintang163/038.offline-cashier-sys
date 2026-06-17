package com.cashier.server.dto;

import lombok.Data;

import java.util.List;

@Data
public class PurchaseSuggestionConfirmDTO {

    private Long suggestionId;

    private String confirmRemark;

    private List<ConfirmItem> items;

    @Data
    public static class ConfirmItem {
        private Long itemId;
        private Long productId;
        private java.math.BigDecimal confirmedQuantity;
        private java.math.BigDecimal confirmedAmount;
        private String remark;
    }
}
