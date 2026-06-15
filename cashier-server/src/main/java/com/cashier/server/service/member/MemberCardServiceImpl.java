package com.cashier.server.service.member;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.common.BusinessException;
import com.cashier.server.dto.member.CardPayDTO;
import com.cashier.server.dto.member.CardReserveDTO;
import com.cashier.server.entity.member.Member;
import com.cashier.server.entity.member.MemberCard;
import com.cashier.server.entity.member.MemberCardRecord;
import com.cashier.server.mapper.member.MemberCardMapper;
import com.cashier.server.mapper.member.MemberCardRecordMapper;
import com.cashier.server.mapper.member.MemberMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

@Service
public class MemberCardServiceImpl extends ServiceImpl<MemberCardMapper, MemberCard> implements MemberCardService {

    @Autowired
    private MemberCardRecordMapper memberCardRecordMapper;

    @Autowired
    private MemberMapper memberMapper;

    @Override
    public MemberCard getByCardNo(String cardNo) {
        return baseMapper.getByCardNo(cardNo);
    }

    @Override
    public List<MemberCard> getByMemberId(Long memberId) {
        return baseMapper.getByMemberId(memberId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> pay(CardPayDTO dto) {
        MemberCard card = getById(dto.getCardId());
        if (card == null) {
            throw new BusinessException("卡片不存在");
        }
        if (card.getStatus() == null || card.getStatus() != 1) {
            throw new BusinessException("卡片状态不可用");
        }

        BigDecimal balance = card.getBalance() != null ? card.getBalance() : BigDecimal.ZERO;
        BigDecimal reservedBalance = card.getReservedBalance() != null ? card.getReservedBalance() : BigDecimal.ZERO;
        BigDecimal available = balance.subtract(reservedBalance);
        BigDecimal amount = dto.getAmount();

        if (available.compareTo(amount) < 0) {
            throw new BusinessException("可用余额不足");
        }

        BigDecimal beforeReserved = reservedBalance;
        BigDecimal afterReservedStep1 = reservedBalance.add(amount);
        lambdaUpdate()
                .set(MemberCard::getReservedBalance, afterReservedStep1)
                .eq(MemberCard::getId, card.getId())
                .update();

        String reserveRecordNo = generateRecordNo();
        MemberCardRecord reserveRecord = new MemberCardRecord();
        reserveRecord.setRecordNo(reserveRecordNo);
        reserveRecord.setCardId(card.getId());
        reserveRecord.setCardNo(card.getCardNo());
        reserveRecord.setMemberId(card.getMemberId());
        reserveRecord.setTradeType(4);
        reserveRecord.setTradeAmount(amount);
        reserveRecord.setBeforeBalance(balance);
        reserveRecord.setAfterBalance(balance);
        reserveRecord.setBeforeReserved(beforeReserved);
        reserveRecord.setAfterReserved(afterReservedStep1);
        reserveRecord.setOrderNo(dto.getOrderNo());
        reserveRecord.setSyncStatus(0);
        reserveRecord.setSyncAttempts(0);
        memberCardRecordMapper.insert(reserveRecord);

        BigDecimal afterBalance = balance.subtract(amount);
        BigDecimal afterReservedStep2 = afterReservedStep1.subtract(amount);
        lambdaUpdate()
                .set(MemberCard::getBalance, afterBalance)
                .set(MemberCard::getReservedBalance, afterReservedStep2)
                .eq(MemberCard::getId, card.getId())
                .update();

        MemberCardRecord confirmRecord = new MemberCardRecord();
        confirmRecord.setRecordNo(generateRecordNo());
        confirmRecord.setCardId(card.getId());
        confirmRecord.setCardNo(card.getCardNo());
        confirmRecord.setMemberId(card.getMemberId());
        confirmRecord.setTradeType(5);
        confirmRecord.setTradeAmount(amount.negate());
        confirmRecord.setBeforeBalance(balance);
        confirmRecord.setAfterBalance(afterBalance);
        confirmRecord.setBeforeReserved(afterReservedStep1);
        confirmRecord.setAfterReserved(afterReservedStep2);
        confirmRecord.setOrderNo(dto.getOrderNo());
        confirmRecord.setRelatedRecordNo(reserveRecordNo);
        confirmRecord.setSyncStatus(0);
        confirmRecord.setSyncAttempts(0);
        memberCardRecordMapper.insert(confirmRecord);

        Long memberId = card.getMemberId();
        if (memberId != null) {
            Member member = memberMapper.selectById(memberId);
            if (member != null) {
                BigDecimal totalConsume = member.getTotalConsume() != null ? member.getTotalConsume() : BigDecimal.ZERO;
                Integer totalOrders = member.getTotalOrders() != null ? member.getTotalOrders() : 0;
                member.setTotalConsume(totalConsume.add(amount));
                member.setTotalOrders(totalOrders + 1);
                memberMapper.updateById(member);
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("balance", afterBalance);
        result.put("reserved", afterReservedStep2);
        result.put("message", "支付成功");
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> reserve(CardReserveDTO dto) {
        MemberCard card = getById(dto.getCardId());
        if (card == null) {
            throw new BusinessException("卡片不存在");
        }
        if (card.getStatus() == null || card.getStatus() != 1) {
            throw new BusinessException("卡片状态不可用");
        }

        BigDecimal balance = card.getBalance() != null ? card.getBalance() : BigDecimal.ZERO;
        BigDecimal reservedBalance = card.getReservedBalance() != null ? card.getReservedBalance() : BigDecimal.ZERO;
        BigDecimal available = balance.subtract(reservedBalance);
        BigDecimal amount = dto.getAmount();

        if (available.compareTo(amount) < 0) {
            throw new BusinessException("可用余额不足");
        }

        BigDecimal afterReserved = reservedBalance.add(amount);
        lambdaUpdate()
                .set(MemberCard::getReservedBalance, afterReserved)
                .eq(MemberCard::getId, card.getId())
                .update();

        MemberCardRecord reserveRecord = new MemberCardRecord();
        reserveRecord.setRecordNo(generateRecordNo());
        reserveRecord.setCardId(card.getId());
        reserveRecord.setCardNo(card.getCardNo());
        reserveRecord.setMemberId(card.getMemberId());
        reserveRecord.setTradeType(4);
        reserveRecord.setTradeAmount(amount);
        reserveRecord.setBeforeBalance(balance);
        reserveRecord.setAfterBalance(balance);
        reserveRecord.setBeforeReserved(reservedBalance);
        reserveRecord.setAfterReserved(afterReserved);
        reserveRecord.setOrderNo(dto.getOrderNo());
        reserveRecord.setSyncStatus(0);
        reserveRecord.setSyncAttempts(0);
        memberCardRecordMapper.insert(reserveRecord);

        Map<String, Object> result = new HashMap<>();
        result.put("balance", balance);
        result.put("reserved", afterReserved);
        result.put("message", "预授权成功");
        return result;
    }

    private String generateRecordNo() {
        return "CR" + System.currentTimeMillis() + String.format("%04d", new Random().nextInt(10000));
    }
}
