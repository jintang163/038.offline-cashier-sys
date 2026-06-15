package com.cashier.server.service.member;

import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.dto.member.CardPayDTO;
import com.cashier.server.dto.member.CardReserveDTO;
import com.cashier.server.entity.member.MemberCard;

import java.util.List;
import java.util.Map;

public interface MemberCardService extends IService<MemberCard> {

    MemberCard getByCardNo(String cardNo);

    List<MemberCard> getByMemberId(Long memberId);

    Map<String, Object> pay(CardPayDTO dto);

    Map<String, Object> reserve(CardReserveDTO dto);
}
