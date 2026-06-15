package com.cashier.server.mapper.member;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cashier.server.dto.member.MemberSyncDTO;
import com.cashier.server.entity.member.Member;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface MemberMapper extends BaseMapper<Member> {

    @Select("SELECT * FROM member WHERE phone = #{phone} AND is_deleted = 0")
    Member getByPhone(@Param("phone") String phone);

    @Select("SELECT * FROM member WHERE card_no = #{cardNo} AND is_deleted = 0")
    Member getByCardNo(@Param("cardNo") String cardNo);

    @Select("<script>" +
            "SELECT id, erp_member_id, phone, card_no, member_name, level_id, level_name, " +
            "discount_rate, points, total_points, balance, status, last_used_time, update_time, " +
            "birthday, gender FROM member WHERE is_deleted = 0 " +
            "<if test='status != null'>AND status = #{status}</if> " +
            "<if test='updateTime != null'>AND update_time > #{updateTime}</if> " +
            "ORDER BY id LIMIT 1000" +
            "</script>")
    List<MemberSyncDTO> getSyncList(@Param("updateTime") LocalDateTime updateTime, @Param("status") Integer status);

    @Select("<script>" +
            "SELECT * FROM member WHERE birthday IS NOT NULL AND is_deleted = 0 " +
            "AND ( " +
            "   (MONTH(NOW())*100 + DAY(NOW()) &lt;= MONTH(NOW() + INTERVAL #{days} DAY)*100 + DAY(NOW() + INTERVAL #{days} DAY) " +
            "       AND MONTH(birthday)*100 + DAY(birthday) BETWEEN MONTH(NOW())*100+DAY(NOW()) AND MONTH(NOW() + INTERVAL #{days} DAY)*100 + DAY(NOW() + INTERVAL #{days} DAY)) " +
            "   OR " +
            "   (MONTH(NOW())*100 + DAY(NOW()) > MONTH(NOW() + INTERVAL #{days} DAY)*100 + DAY(NOW() + INTERVAL #{days} DAY) " +
            "       AND (MONTH(birthday)*100 + DAY(birthday) >= MONTH(NOW())*100+DAY(NOW()) " +
            "           OR MONTH(birthday)*100 + DAY(birthday) &lt;= MONTH(NOW() + INTERVAL #{days} DAY)*100 + DAY(NOW() + INTERVAL #{days} DAY))) " +
            ") " +
            "ORDER BY MONTH(birthday), DAY(birthday)" +
            "</script>")
    List<Member> getBirthdayMembers(@Param("days") Integer days);
}
