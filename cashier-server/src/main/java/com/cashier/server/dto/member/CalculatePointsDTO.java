package com.cashier.server.dto.member;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CalculatePointsDTO {

    @Data
    public static class Request {

        private Long memberId;

        private BigDecimal amount;
    }

    @Data
    public static class Response {

        private Integer totalPoints;

        private List<RuleDetail> ruleDetails;

        private Integer basePoints;
    }

    @Data
    public static class RuleDetail {

        private String ruleCode;

        private String ruleName;

        private Integer points;
    }
}
