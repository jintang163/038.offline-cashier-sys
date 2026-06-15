package com.cashier.server.service.member;

import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.member.MemberLevel;

import java.util.List;

public interface MemberLevelService extends IService<MemberLevel> {

    List<MemberLevel> listAllEnabled();
}
