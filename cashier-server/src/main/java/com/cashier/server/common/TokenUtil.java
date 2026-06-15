package com.cashier.server.common;

import cn.hutool.core.util.IdUtil;
import com.cashier.server.entity.system.SysUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
public class TokenUtil {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    private static final long TOKEN_EXPIRE_HOURS = 24;

    public String createToken(SysUser user) {
        String token = IdUtil.fastSimpleUUID();
        String tokenKey = Constants.REDIS_TOKEN_PREFIX + token;
        String userKey = Constants.REDIS_USER_PREFIX + user.getId();

        redisTemplate.opsForValue().set(tokenKey, user.getId(), TOKEN_EXPIRE_HOURS, TimeUnit.HOURS);
        redisTemplate.opsForValue().set(userKey, token, TOKEN_EXPIRE_HOURS, TimeUnit.HOURS);

        return token;
    }

    public Long getUserIdByToken(String token) {
        if (token == null || token.isEmpty()) {
            return null;
        }
        String tokenKey = Constants.REDIS_TOKEN_PREFIX + token;
        Object userId = redisTemplate.opsForValue().get(tokenKey);
        if (userId instanceof Integer) {
            return ((Integer) userId).longValue();
        }
        return (Long) userId;
    }

    public boolean validateToken(String token) {
        if (token == null || token.isEmpty()) {
            return false;
        }
        String tokenKey = Constants.REDIS_TOKEN_PREFIX + token;
        return Boolean.TRUE.equals(redisTemplate.hasKey(tokenKey));
    }

    public void removeToken(String token) {
        if (token == null || token.isEmpty()) {
            return;
        }
        String tokenKey = Constants.REDIS_TOKEN_PREFIX + token;
        Long userId = getUserIdByToken(token);
        redisTemplate.delete(tokenKey);
        if (userId != null) {
            String userKey = Constants.REDIS_USER_PREFIX + userId;
            redisTemplate.delete(userKey);
        }
    }

    public void refreshToken(String token) {
        if (token == null || token.isEmpty()) {
            return;
        }
        String tokenKey = Constants.REDIS_TOKEN_PREFIX + token;
        Long userId = getUserIdByToken(token);
        if (userId != null) {
            redisTemplate.expire(tokenKey, TOKEN_EXPIRE_HOURS, TimeUnit.HOURS);
            String userKey = Constants.REDIS_USER_PREFIX + userId;
            redisTemplate.expire(userKey, TOKEN_EXPIRE_HOURS, TimeUnit.HOURS);
        }
    }
}
