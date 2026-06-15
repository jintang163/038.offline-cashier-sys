package com.cashier.server.service.member;

import com.cashier.server.common.BusinessException;
import com.cashier.server.dto.member.CalculatePointsDTO;
import com.cashier.server.entity.member.Member;
import com.cashier.server.entity.member.MemberLevel;
import com.cashier.server.entity.member.PointRule;
import com.cashier.server.mapper.member.MemberLevelMapper;
import com.cashier.server.mapper.member.MemberMapper;
import com.cashier.server.mapper.member.PointRuleMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
public class PointRuleEngineServiceImpl implements PointRuleEngineService {

    @Autowired
    private PointRuleMapper pointRuleMapper;

    @Autowired
    private MemberMapper memberMapper;

    @Autowired
    private MemberLevelMapper memberLevelMapper;

    @Override
    public CalculatePointsDTO.Response calculate(CalculatePointsDTO.Request request) {
        Long memberId = request.getMemberId();
        BigDecimal amount = request.getAmount();

        Member member = memberMapper.selectById(memberId);
        if (member == null) {
            throw new BusinessException("会员不存在");
        }

        List<PointRule> listActiveRules = pointRuleMapper.listActiveRules();

        MemberLevel memberLevel = null;
        if (member.getLevelId() != null) {
            memberLevel = memberLevelMapper.selectById(member.getLevelId());
        }

        int totalPoints = 0;
        List<CalculatePointsDTO.RuleDetail> ruleDetails = new ArrayList<>();
        boolean nonStackableApplied = false;

        for (PointRule rule : listActiveRules) {
            if (nonStackableApplied) {
                continue;
            }

            BigDecimal minAmount = rule.getMinAmount();
            if (minAmount != null && amount.compareTo(minAmount) < 0) {
                continue;
            }
            BigDecimal maxAmount = rule.getMaxAmount();
            if (maxAmount != null && amount.compareTo(maxAmount) > 0) {
                continue;
            }

            String applicableLevels = rule.getApplicableLevels();
            if (StringUtils.hasText(applicableLevels)) {
                List<String> levelIds = Arrays.asList(applicableLevels.split(","));
                if (!levelIds.contains(String.valueOf(member.getLevelId()))) {
                    continue;
                }
            }

            int points = 0;
            Integer ruleType = rule.getRuleType();
            BigDecimal ruleValue = rule.getRuleValue();
            if (ruleValue == null) {
                ruleValue = BigDecimal.ZERO;
            }

            switch (ruleType) {
                case 1:
                    if (ruleValue.compareTo(BigDecimal.ZERO) > 0) {
                        points = amount.divide(ruleValue, 0, RoundingMode.DOWN).intValue() * 1;
                    }
                    break;
                case 2:
                    points = amount.multiply(ruleValue).setScale(0, RoundingMode.DOWN).intValue();
                    break;
                case 3:
                    points = ruleValue.intValue();
                    break;
                case 4:
                    BigDecimal levelRate = memberLevel != null ? memberLevel.getPointRate() : BigDecimal.ONE;
                    if (levelRate == null) {
                        levelRate = BigDecimal.ONE;
                    }
                    points = amount.multiply(ruleValue).multiply(levelRate).setScale(0, RoundingMode.DOWN).intValue();
                    break;
                default:
                    break;
            }

            if (points > 0) {
                totalPoints += points;
                CalculatePointsDTO.RuleDetail detail = new CalculatePointsDTO.RuleDetail();
                detail.setRuleCode(rule.getRuleCode());
                detail.setRuleName(rule.getRuleName());
                detail.setPoints(points);
                ruleDetails.add(detail);
            }

            if (rule.getStackable() != null && rule.getStackable() == 0) {
                nonStackableApplied = true;
            }
        }

        CalculatePointsDTO.Response response = new CalculatePointsDTO.Response();
        response.setTotalPoints(totalPoints);
        response.setRuleDetails(ruleDetails);
        response.setBasePoints(amount.setScale(0, RoundingMode.DOWN).intValue());
        return response;
    }
}
