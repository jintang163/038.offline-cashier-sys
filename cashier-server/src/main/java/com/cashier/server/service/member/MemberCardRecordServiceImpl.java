package com.cashier.server.service.member;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.entity.member.MemberCardRecord;
import com.cashier.server.mapper.member.MemberCardRecordMapper;
import org.springframework.stereotype.Service;

@Service
public class MemberCardRecordServiceImpl extends ServiceImpl<MemberCardRecordMapper, MemberCardRecord> implements MemberCardRecordService {
}
