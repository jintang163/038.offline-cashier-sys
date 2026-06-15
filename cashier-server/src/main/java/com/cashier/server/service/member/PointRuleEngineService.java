package com.cashier.server.service.member;

import com.cashier.server.dto.member.CalculatePointsDTO;

public interface PointRuleEngineService {

    CalculatePointsDTO.Response calculate(CalculatePointsDTO.Request request);
}
