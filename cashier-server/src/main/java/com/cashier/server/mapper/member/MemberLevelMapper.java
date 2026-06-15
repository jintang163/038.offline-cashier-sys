package com.cashier.server.mapper.member;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cashier.server.entity.member.MemberLevel;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface MemberLevelMapper extends BaseMapper<MemberLevel> {

    @Select("SELECT * FROM member_level WHERE status = 1 AND is_deleted = 0 ORDER BY sort_order ASC, id ASC")
    List<MemberLevel> listAllEnabled();
}
