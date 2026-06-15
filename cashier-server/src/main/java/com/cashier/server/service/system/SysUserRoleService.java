package com.cashier.server.service.system;

import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.system.SysUserRole;

import java.util.List;

public interface SysUserRoleService extends IService<SysUserRole> {

    List<SysUserRole> getRolesByUserId(Long userId);
}
