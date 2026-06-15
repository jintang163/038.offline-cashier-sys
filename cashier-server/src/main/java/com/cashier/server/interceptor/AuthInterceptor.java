package com.cashier.server.interceptor;

import com.cashier.server.common.Constants;
import com.cashier.server.common.Result;
import com.cashier.server.common.ResultCode;
import com.cashier.server.common.TokenUtil;
import com.cashier.server.common.UserContext;
import com.cashier.server.entity.system.SysUser;
import com.cashier.server.service.system.SysUserService;
import com.alibaba.fastjson.JSON;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    @Autowired
    private TokenUtil tokenUtil;

    @Autowired
    private SysUserService sysUserService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String token = request.getHeader(Constants.TOKEN_HEADER);
        if (token != null && token.startsWith(Constants.TOKEN_PREFIX)) {
            token = token.substring(Constants.TOKEN_PREFIX.length());
        }

        if (token == null || token.isEmpty()) {
            return true;
        }

        if (!tokenUtil.validateToken(token)) {
            return true;
        }

        Long userId = tokenUtil.getUserIdByToken(token);
        if (userId != null) {
            SysUser user = sysUserService.getUserById(userId);
            if (user != null) {
                UserContext.setCurrentUser(user);
                tokenUtil.refreshToken(token);
            }
        }

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) throws Exception {
        UserContext.clear();
    }
}
