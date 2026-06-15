package com.cashier.server.mapper.member;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cashier.server.entity.member.MemberCardRecord;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface MemberCardRecordMapper extends BaseMapper<MemberCardRecord> {

    @Select("SELECT * FROM member_card_record WHERE sync_status <![CDATA[<]]> 1 AND is_deleted = 0 ORDER BY create_time ASC LIMIT #{limit}")
    List<MemberCardRecord> getUnsyncedRecords(@Param("limit") Integer limit);
}
