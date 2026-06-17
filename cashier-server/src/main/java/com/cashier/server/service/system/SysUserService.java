package com.cashier.server.service.system;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.system.SysUser;

import java.util.Map;

public interface SysUserService extends IService<SysUser> {

    Map<String, Object> login(String username, String password);

    SysUser getUserById(Long id);

    IPage<SysUser> listUsers(Integer page, Integer size, String keyword, Integer status);

    boolean logout(String token);

    SysUser getUserByToken(String token);

    Map<String, Object> verifyManager(String username, String password);
}
