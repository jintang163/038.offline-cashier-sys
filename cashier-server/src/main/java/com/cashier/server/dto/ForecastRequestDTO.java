package com.cashier.server.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class ForecastRequestDTO {

    private Integer forecastDays = 7;

    private LocalDate startDate;

    private LocalDate endDate;

    private Integer safetyStockDays = 3;

    private String shopId;

    private String shopName;

    private Integer generateType = 2;

    private String remark;
}
