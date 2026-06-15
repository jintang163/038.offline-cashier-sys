package com.cashier.server.service.member;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.dto.member.BatchSyncPointResultDTO;
import com.cashier.server.dto.member.PointRecordSyncDTO;
import com.cashier.server.entity.member.Member;
import com.cashier.server.entity.member.PointRecord;
import com.cashier.server.mapper.member.PointRecordMapper;
import com.cashier.server.service.erp.ErpSyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class PointRecordServiceImpl extends ServiceImpl<PointRecordMapper, PointRecord> implements PointRecordService {

    private static final Logger log = LoggerFactory.getLogger(PointRecordServiceImpl.class);

    @Autowired
    private MemberService memberService;

    @Autowired
    private ErpSyncService erpSyncService;

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
        List<PointRecord> successRecords = new ArrayList<>();

        for (PointRecordSyncDTO dto : records) {
            try {
                PointRecord record = syncSingleRecord(dto);
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
                erpSyncService.pushMemberPointsToErp(successRecords);
            } catch (Exception e) {
                log.warn("积分记录同步ERP失败: {}", e.getMessage(), e);
            }
        }

        BatchSyncPointResultDTO result = new BatchSyncPointResultDTO();
        result.setSuccessCount(successCount);
        result.setFailCount(failCount);
        result.setFailRecords(failRecords);
        return result;
    }

    private PointRecord syncSingleRecord(PointRecordSyncDTO dto) {
        Long memberId = dto.getMemberId();
        if (memberId == null) {
            throw new RuntimeException("会员ID不能为空");
        }

        Member member = memberService.getById(memberId);
        if (member == null) {
            throw new RuntimeException("会员不存在: memberId=" + memberId);
        }

        Integer beforePoints = dto.getBeforePoints() != null ? dto.getBeforePoints() : 0;
        Integer changePoints = dto.getChangePoints() != null ? dto.getChangePoints() : 0;
        Integer afterPoints = dto.getAfterPoints() != null ? dto.getAfterPoints() : 0;

        if (!beforePoints.equals(0) || !changePoints.equals(0) || !afterPoints.equals(0)) {
            if (beforePoints + changePoints != afterPoints) {
                throw new RuntimeException("积分变动前后不一致: before=" + beforePoints + ", change=" + changePoints + ", after=" + afterPoints);
            }
        }

        PointRecord existingRecord = null;
        if (StringUtils.hasText(dto.getRecordNo())) {
            existingRecord = lambdaQuery()
                    .eq(PointRecord::getRecordNo, dto.getRecordNo())
                    .one();
        }

        if (existingRecord != null && existingRecord.getSyncStatus() != null && existingRecord.getSyncStatus() == 1) {
            return existingRecord;
        }

        Integer syncAttempts = dto.getSyncAttempts() != null ? dto.getSyncAttempts() : 0;

        if (existingRecord == null) {
            Integer currentPoints = member.getPoints() != null ? member.getPoints() : 0;
            if (changePoints < 0 && currentPoints + changePoints < 0) {
                throw new RuntimeException("积分不足，扣减后积分不能为负: current=" + currentPoints + ", change=" + changePoints);
            }

            Integer totalPoints = member.getTotalPoints() != null ? member.getTotalPoints() : 0;
            memberService.lambdaUpdate()
                    .set(Member::getPoints, currentPoints + changePoints)
                    .set(changePoints > 0, Member::getTotalPoints, totalPoints + changePoints)
                    .eq(Member::getId, memberId)
                    .update();

            PointRecord record = new PointRecord();
            BeanUtils.copyProperties(dto, record, "id", "createTime", "updateTime", "isDeleted");
            record.setSyncStatus(1);
            record.setSyncTime(LocalDateTime.now());
            record.setSyncAttempts(syncAttempts + 1);
            save(record);
            return record;
        } else {
            existingRecord.setSyncStatus(1);
            existingRecord.setSyncTime(LocalDateTime.now());
            existingRecord.setSyncAttempts(syncAttempts + 1);
            updateById(existingRecord);
            return existingRecord;
        }
    }
}
