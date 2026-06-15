package com.cashier.server.mapper.member;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cashier.server.entity.member.MemberCard;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface MemberCardMapper extends BaseMapper<MemberCard> {

    @Select("SELECT * FROM member_card WHERE card_no = #{cardNo} AND is_deleted = 0")
    MemberCard getByCardNo(@Param("cardNo") String cardNo);

    @Select("SELECT * FROM member_card WHERE member_id = #{memberId} AND status = 1 AND is_deleted = 0 ORDER BY create_time DESC")
    List<MemberCard> getByMemberId(@Param("memberId") Long memberId);
}
