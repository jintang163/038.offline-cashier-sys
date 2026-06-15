package com.cashier.server.controller.system;

import com.cashier.server.common.Constants;
import com.cashier.server.common.Result;
import com.cashier.server.entity.system.SysUser;
import com.cashier.server.service.system.SysUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private SysUserService sysUserService;

    @PostMapping("/login")
    public Result<Map<String, Object>> login(@RequestBody Map<String, String> params) {
        String username = params.get("username");
        String password = params.get("password");
        Map<String, Object> result = sysUserService.login(username, password);
        return Result.success(result);
    }

    @GetMapping("/userinfo")
    public Result<SysUser> getUserInfo(HttpServletRequest request) {
        String token = request.getHeader(Constants.TOKEN_HEADER);
        if (token != null && token.startsWith(Constants.TOKEN_PREFIX)) {
            token = token.substring(Constants.TOKEN_PREFIX.length());
        }
        SysUser user = sysUserService.getUserByToken(token);
        return Result.success(user);
    }

    @PostMapping("/logout")
    public Result<Void> logout(HttpServletRequest request) {
        String token = request.getHeader(Constants.TOKEN_HEADER);
        if (token != null && token.startsWith(Constants.TOKEN_PREFIX)) {
            token = token.substring(Constants.TOKEN_PREFIX.length());
        }
        sysUserService.logout(token);
        return Result.success();
    }
}
