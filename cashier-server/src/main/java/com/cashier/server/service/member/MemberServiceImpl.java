package com.cashier.server.service.member;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.common.BusinessException;
import com.cashier.server.dto.member.MemberSyncDTO;
import com.cashier.server.entity.member.Member;
import com.cashier.server.entity.member.PointRecord;
import com.cashier.server.mapper.member.MemberMapper;
import com.cashier.server.mapper.member.PointRecordMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

@Service
public class MemberServiceImpl extends ServiceImpl<MemberMapper, Member> implements MemberService {

    @Autowired
    private PointRecordMapper pointRecordMapper;

    @Override
    public Member getByPhone(String phone) {
        return baseMapper.getByPhone(phone);
    }

    @Override
    public Member getByCardNo(String cardNo) {
        return baseMapper.getByCardNo(cardNo);
    }

    @Override
    public IPage<Member> getMemberList(Integer page, Integer size, String keyword, Integer status) {
        LambdaQueryWrapper<Member> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(Member::getPhone, keyword)
                    .or().like(Member::getCardNo, keyword)
                    .or().like(Member::getMemberName, keyword));
        }
        if (status != null) {
            wrapper.eq(Member::getStatus, status);
        }
        wrapper.orderByDesc(Member::getCreateTime);
        return page(new Page<>(page, size), wrapper);
    }

    @Override
    public List<MemberSyncDTO> getSyncList(LocalDateTime updateTime, Integer status) {
        List<com.cashier.server.dto.MemberSyncDTO> list = baseMapper.getSyncList(updateTime, status);
        return list.stream().map(source -> {
            MemberSyncDTO target = new MemberSyncDTO();
            BeanUtils.copyProperties(source, target);
            return target;
        }).collect(Collectors.toList());
    }

    @Override
    public List<Member> getBirthdayMembers(Integer days) {
        return baseMapper.getBirthdayMembers(days);
    }

    @Override
    public void updateLastUsedTime(Long memberId) {
        lambdaUpdate()
                .set(Member::getLastUsedTime, LocalDateTime.now())
                .eq(Member::getId, memberId)
                .update();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> addPoints(Long memberId, Integer points, String orderNo, String remark, Long cashierId, String cashierName) {
        Member member = getById(memberId);
        if (member == null) {
            throw new BusinessException("会员不存在");
        }

        Integer beforePoints = member.getPoints() != null ? member.getPoints() : 0;
        Integer afterPoints = beforePoints + points;

        Integer totalPoints = member.getTotalPoints() != null ? member.getTotalPoints() : 0;
        Integer newTotalPoints = totalPoints + points;

        member.setPoints(afterPoints);
        member.setTotalPoints(newTotalPoints);
        updateById(member);

        PointRecord record = new PointRecord();
        record.setRecordNo(generateRecordNo());
        record.setMemberId(memberId);
        record.setPhone(member.getPhone());
        record.setChangeType(1);
        record.setChangePoints(points);
        record.setBeforePoints(beforePoints);
        record.setAfterPoints(afterPoints);
        record.setOrderNo(orderNo);
        record.setSourceType(1);
        record.setCashierId(cashierId);
        record.setCashierName(cashierName);
        record.setRemark(remark);
        record.setSyncStatus(0);
        record.setSyncAttempts(0);
        pointRecordMapper.insert(record);

        Map<String, Object> result = new HashMap<>();
        result.put("points", points);
        result.put("beforePoints", beforePoints);
        result.put("afterPoints", afterPoints);
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> deductPoints(Long memberId, Integer points, String orderNo, String remark, Long cashierId, String cashierName) {
        Member member = getById(memberId);
        if (member == null) {
            throw new BusinessException("会员不存在");
        }

        Integer beforePoints = member.getPoints() != null ? member.getPoints() : 0;
        if (beforePoints < points) {
            throw new BusinessException("积分不足");
        }
        Integer afterPoints = beforePoints - points;

        member.setPoints(afterPoints);
        updateById(member);

        PointRecord record = new PointRecord();
        record.setRecordNo(generateRecordNo());
        record.setMemberId(memberId);
        record.setPhone(member.getPhone());
        record.setChangeType(2);
        record.setChangePoints(-points);
        record.setBeforePoints(beforePoints);
        record.setAfterPoints(afterPoints);
        record.setOrderNo(orderNo);
        record.setSourceType(2);
        record.setCashierId(cashierId);
        record.setCashierName(cashierName);
        record.setRemark(remark);
        record.setSyncStatus(0);
        record.setSyncAttempts(0);
        pointRecordMapper.insert(record);

        Map<String, Object> result = new HashMap<>();
        result.put("points", points);
        result.put("beforePoints", beforePoints);
        result.put("afterPoints", afterPoints);
        return result;
    }

    private String generateRecordNo() {
        return "PR" + System.currentTimeMillis() + String.format("%04d", new Random().nextInt(10000));
    }
}
