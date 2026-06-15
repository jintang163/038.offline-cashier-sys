package com.cashier.server.service.member;

import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.dto.member.BatchSyncPointResultDTO;
import com.cashier.server.dto.member.MemberCardRecordSyncDTO;
import com.cashier.server.entity.member.MemberCardRecord;

import java.util.List;

public interface MemberCardRecordService extends IService<MemberCardRecord> {

    List<MemberCardRecord> getUnsyncedRecords(Integer limit);

    BatchSyncPointResultDTO batchSyncCardRecords(List<MemberCardRecordSyncDTO> records);
}
