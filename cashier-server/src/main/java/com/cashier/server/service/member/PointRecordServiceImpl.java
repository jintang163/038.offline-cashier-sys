package com.cashier.server.service.member;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.dto.member.BatchSyncPointResultDTO;
import com.cashier.server.dto.member.PointRecordSyncDTO;
import com.cashier.server.entity.member.Member;
import com.cashier.server.entity.member.PointRecord;
import com.cashier.server.mapper.member.MemberMapper;
import com.cashier.server.mapper.member.PointRecordMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class PointRecordServiceImpl extends ServiceImpl<PointRecordMapper, PointRecord> implements PointRecordService {

    @Autowired
    private MemberMapper memberMapper;

    @Override
    public List<PointRecord> getUnsyncedRecords(Integer limit) {
        return baseMapper.getUnsyncedRecords(limit);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BatchSyncPointResultDTO batchSync(List<PointRecordSyncDTO> records) {
        int successCount = 0;
        int failCount = 0;
        List<BatchSyncPointResultDTO.FailRecord> failRecords = new ArrayList<>();

        for (PointRecordSyncDTO dto : records) {
            try {
                syncSingleRecord(dto);
                successCount++;
            } catch (Exception e) {
                failCount++;
                BatchSyncPointResultDTO.FailRecord failRecord = new BatchSyncPointResultDTO.FailRecord();
                failRecord.setRecordNo(dto.getRecordNo());
                failRecord.setError(e.getMessage());
                failRecords.add(failRecord);
            }
        }

        BatchSyncPointResultDTO result = new BatchSyncPointResultDTO();
        result.setSuccessCount(successCount);
        result.setFailCount(failCount);
        result.setFailRecords(failRecords);
        return result;
    }

    private void syncSingleRecord(PointRecordSyncDTO dto) {
        Member member = memberMapper.selectById(dto.getMemberId());
        if (member == null) {
            throw new RuntimeException("会员不存在: memberId=" + dto.getMemberId());
        }

        Integer beforePoints = dto.getBeforePoints() != null ? dto.getBeforePoints() : 0;
        Integer changePoints = dto.getChangePoints() != null ? dto.getChangePoints() : 0;
        Integer afterPoints = dto.getAfterPoints() != null ? dto.getAfterPoints() : 0;

        if (beforePoints + changePoints != afterPoints) {
            throw new RuntimeException("积分变动前后不一致: before=" + beforePoints + ", change=" + changePoints + ", after=" + afterPoints);
        }

        PointRecord existingRecord = null;
        if (StringUtils.hasText(dto.getRecordNo())) {
            existingRecord = lambdaQuery()
                    .eq(PointRecord::getRecordNo, dto.getRecordNo())
                    .one();
        }

        if (existingRecord == null) {
            PointRecord record = new PointRecord();
            record.setRecordNo(dto.getRecordNo());
            record.setMemberId(dto.getMemberId());
            record.setPhone(dto.getPhone());
            record.setChangeType(dto.getChangeType());
            record.setChangePoints(dto.getChangePoints());
            record.setBeforePoints(dto.getBeforePoints());
            record.setAfterPoints(dto.getAfterPoints());
            record.setOrderNo(dto.getOrderNo());
            record.setOrderId(dto.getOrderId());
            record.setSourceType(dto.getSourceType());
            record.setRelatedAmount(dto.getRelatedAmount());
            record.setCashierId(dto.getCashierId());
            record.setCashierName(dto.getCashierName());
            record.setStoreId(dto.getStoreId());
            record.setRemark(dto.getRemark());
            record.setSyncStatus(1);
            record.setSyncAttempts(dto.getSyncAttempts());
            record.setSyncError(dto.getSyncError());
            record.setSyncTime(LocalDateTime.now());
            record.setExpiredDate(dto.getExpiredDate());
            save(record);
        } else {
            existingRecord.setSyncStatus(1);
            existingRecord.setSyncTime(LocalDateTime.now());
            updateById(existingRecord);
        }
    }
}
