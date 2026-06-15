package com.cashier.server.service.member;

import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.dto.member.BatchSyncPointResultDTO;
import com.cashier.server.dto.member.PointRecordSyncDTO;
import com.cashier.server.entity.member.PointRecord;

import java.util.List;

public interface PointRecordService extends IService<PointRecord> {

    List<PointRecord> getUnsyncedRecords(Integer limit);

    BatchSyncPointResultDTO batchSync(List<PointRecordSyncDTO> records);
}
