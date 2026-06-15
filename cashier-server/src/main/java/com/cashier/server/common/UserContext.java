package com.cashier.server.common;

import com.cashier.server.entity.system.SysUser;

public class UserContext {

    private static final ThreadLocal<SysUser> currentUser = new ThreadLocal<>();

    public static void setCurrentUser(SysUser user) {
        currentUser.set(user);
    }

    public static SysUser getCurrentUser() {
        return currentUser.get();
    }

    public static Long getCurrentUserId() {
        SysUser user = currentUser.get();
        return user != null ? user.getId() : null;
    }

    public static void clear() {
        currentUser.remove();
    }
}
