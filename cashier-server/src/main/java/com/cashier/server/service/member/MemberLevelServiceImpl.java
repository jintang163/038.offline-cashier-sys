package com.cashier.server.service.member;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.entity.member.MemberLevel;
import com.cashier.server.mapper.member.MemberLevelMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MemberLevelServiceImpl extends ServiceImpl<MemberLevelMapper, MemberLevel> implements MemberLevelService {

    @Override
    public List<MemberLevel> listAllEnabled() {
        return baseMapper.listAllEnabled();
    }
}
