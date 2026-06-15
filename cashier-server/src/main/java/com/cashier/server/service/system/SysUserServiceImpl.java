package com.cashier.server.service.system;

import cn.hutool.crypto.digest.DigestUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.common.BusinessException;
import com.cashier.server.common.Constants;
import com.cashier.server.common.TokenUtil;
import com.cashier.server.entity.system.SysUser;
import com.cashier.server.mapper.system.SysUserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.Map;

@Service
public class SysUserServiceImpl extends ServiceImpl<SysUserMapper, SysUser> implements SysUserService {

    @Autowired
    private TokenUtil tokenUtil;

    @Override
    public Map<String, Object> login(String username, String password) {
        if (!StringUtils.hasText(username) || !StringUtils.hasText(password)) {
            throw new BusinessException("用户名和密码不能为空");
        }

        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SysUser::getUsername, username);
        SysUser user = getOne(wrapper);

        if (user == null) {
            throw new BusinessException("用户不存在");
        }

        if (user.getStatus() != null && user.getStatus() == 0) {
            throw new BusinessException("用户已被禁用");
        }

        String md5Password = DigestUtil.md5Hex(password);
        if (!md5Password.equals(user.getPassword())) {
            throw new BusinessException("密码错误");
        }

        String token = tokenUtil.createToken(user);

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        user.setPassword(null);
        result.put("userInfo", user);

        return result;
    }

    @Override
    public SysUser getUserById(Long id) {
        SysUser user = getById(id);
        if (user != null) {
            user.setPassword(null);
        }
        return user;
    }

    @Override
    public IPage<SysUser> listUsers(Integer page, Integer size, String keyword, Integer status) {
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.like(SysUser::getUsername, keyword)
                    .or().like(SysUser::getNickname, keyword)
                    .or().like(SysUser::getPhone, keyword);
        }
        if (status != null) {
            wrapper.eq(SysUser::getStatus, status);
        }
        wrapper.orderByDesc(SysUser::getCreateTime);
        IPage<SysUser> result = page(new Page<>(page, size), wrapper);
        if (result.getRecords() != null) {
            result.getRecords().forEach(user -> user.setPassword(null));
        }
        return result;
    }

    @Override
    public boolean logout(String token) {
        tokenUtil.removeToken(token);
        return true;
    }

    @Override
    public SysUser getUserByToken(String token) {
        Long userId = tokenUtil.getUserIdByToken(token);
        if (userId == null) {
            return null;
        }
        return getUserById(userId);
    }
}
