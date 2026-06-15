package com.cashier.server.service.member;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.dto.member.MemberSyncDTO;
import com.cashier.server.entity.member.Member;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface MemberService extends IService<Member> {

    Member getByPhone(String phone);

    Member getByCardNo(String cardNo);

    IPage<Member> getMemberList(Integer page, Integer size, String keyword, Integer status);

    List<MemberSyncDTO> getSyncList(LocalDateTime updateTime, Integer status);

    List<Member> getBirthdayMembers(Integer days);

    void updateLastUsedTime(Long memberId);

    Map<String, Object> addPoints(Long memberId, Integer points, String orderNo, String remark, Long cashierId, String cashierName);

    Map<String, Object> deductPoints(Long memberId, Integer points, String orderNo, String remark, Long cashierId, String cashierName);
}
