package com.cashier.server.dto.member;

import lombok.Data;

@Data
public class PointChangeDTO {

    private Long memberId;

    private Integer points;

    private String orderNo;

    private String remark;
}
