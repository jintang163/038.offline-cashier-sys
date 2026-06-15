package com.cashier.server.service.member;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.dto.member.BatchSyncPointResultDTO;
import com.cashier.server.dto.member.MemberCardRecordSyncDTO;
import com.cashier.server.entity.member.MemberCard;
import com.cashier.server.entity.member.MemberCardRecord;
import com.cashier.server.mapper.member.MemberCardRecordMapper;
import com.cashier.server.service.erp.ErpSyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class MemberCardRecordServiceImpl extends ServiceImpl<MemberCardRecordMapper, MemberCardRecord> implements MemberCardRecordService {

    private static final Logger log = LoggerFactory.getLogger(MemberCardRecordServiceImpl.class);

    @Autowired
    private MemberCardService memberCardService;

    @Autowired
    private ErpSyncService erpSyncService;

    @Override
    public List<MemberCardRecord> getUnsyncedRecords(Integer limit) {
        return baseMapper.getUnsyncedRecords(limit);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BatchSyncPointResultDTO batchSyncCardRecords(List<MemberCardRecordSyncDTO> records) {
        int successCount = 0;
        int failCount = 0;
        List<BatchSyncPointResultDTO.FailRecord> failRecords = new ArrayList<>();
        List<MemberCardRecord> successRecords = new ArrayList<>();

        for (MemberCardRecordSyncDTO dto : records) {
            try {
                MemberCardRecord record = syncSingleRecord(dto);
                successCount++;
                successRecords.add(record);
            } catch (Exception e) {
                failCount++;
                BatchSyncPointResultDTO.FailRecord failRecord = new BatchSyncPointResultDTO.FailRecord();
                failRecord.setRecordNo(dto.getRecordNo());
                failRecord.setError(e.getMessage());
                failRecords.add(failRecord);
            }
        }

        if (!successRecords.isEmpty()) {
            try {
                erpSyncService.pushMemberCardRecordsToErp(successRecords);
            } catch (Exception e) {
                log.warn("储值卡记录同步ERP失败: {}", e.getMessage(), e);
            }
        }

        BatchSyncPointResultDTO result = new BatchSyncPointResultDTO();
        result.setSuccessCount(successCount);
        result.setFailCount(failCount);
        result.setFailRecords(failRecords);
        return result;
    }

    private MemberCardRecord syncSingleRecord(MemberCardRecordSyncDTO dto) {
        Long cardId = dto.getCardId();
        if (cardId == null) {
            throw new RuntimeException("卡片ID不能为空");
        }

        MemberCard card = memberCardService.getById(cardId);
        if (card == null) {
            throw new RuntimeException("储值卡不存在: cardId=" + cardId);
        }

        BigDecimal beforeBalance = dto.getBeforeBalance() != null ? dto.getBeforeBalance() : BigDecimal.ZERO;
        BigDecimal tradeAmount = dto.getTradeAmount() != null ? dto.getTradeAmount() : BigDecimal.ZERO;
        BigDecimal afterBalance = dto.getAfterBalance() != null ? dto.getAfterBalance() : BigDecimal.ZERO;

        if (beforeBalance.add(tradeAmount).compareTo(afterBalance) != 0) {
            throw new RuntimeException("余额变动前后不一致: before=" + beforeBalance + ", trade=" + tradeAmount + ", after=" + afterBalance);
        }

        MemberCardRecord existingRecord = null;
        if (StringUtils.hasText(dto.getRecordNo())) {
            existingRecord = lambdaQuery()
                    .eq(MemberCardRecord::getRecordNo, dto.getRecordNo())
                    .one();
        }

        if (existingRecord != null && existingRecord.getSyncStatus() != null && existingRecord.getSyncStatus() == 1) {
            return existingRecord;
        }

        Integer syncAttempts = dto.getSyncAttempts() != null ? dto.getSyncAttempts() : 0;

        if (existingRecord == null) {
            BigDecimal beforeReserved = dto.getBeforeReserved() != null ? dto.getBeforeReserved() : BigDecimal.ZERO;
            BigDecimal afterReserved = dto.getAfterReserved() != null ? dto.getAfterReserved() : BigDecimal.ZERO;
            BigDecimal reservedChange = afterReserved.subtract(beforeReserved);

            memberCardService.lambdaUpdate()
                    .setSql("balance = balance + " + tradeAmount)
                    .setSql("reserved_balance = reserved_balance + " + reservedChange)
                    .eq(MemberCard::getId, cardId)
                    .update();

            MemberCardRecord record = new MemberCardRecord();
            BeanUtils.copyProperties(dto, record, "id", "createTime", "updateTime", "isDeleted");
            record.setSyncStatus(1);
            record.setSyncAttempts(syncAttempts + 1);
            save(record);
            return record;
        } else {
            existingRecord.setSyncStatus(1);
            existingRecord.setSyncAttempts(syncAttempts + 1);
            updateById(existingRecord);
            return existingRecord;
        }
    }
}
