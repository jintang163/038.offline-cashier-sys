package com.cashier.server.mapper.member;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cashier.server.entity.member.PointRule;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface PointRuleMapper extends BaseMapper<PointRule> {

    @Select("<script>" +
            "SELECT * FROM point_rule WHERE status = 1 AND is_deleted = 0 " +
            "AND (start_date IS NULL OR start_date <= NOW()) " +
            "AND (end_date IS NULL OR end_date >= NOW()) " +
            "ORDER BY priority DESC, id ASC" +
            "</script>")
    List<PointRule> listActiveRules();
}
