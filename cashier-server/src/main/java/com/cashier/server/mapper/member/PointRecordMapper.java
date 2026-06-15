package com.cashier.server.mapper.member;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cashier.server.entity.member.PointRecord;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface PointRecordMapper extends BaseMapper<PointRecord> {

    @Select("SELECT * FROM point_record WHERE sync_status <![CDATA[<]]> 1 AND is_deleted = 0 ORDER BY create_time ASC LIMIT #{limit}")
    List<PointRecord> getUnsyncedRecords(@Param("limit") Integer limit);
}
