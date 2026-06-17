package com.cashier.server.common;

import com.cashier.server.entity.system.SysUser;

public class UserContext {

    private static final ThreadLocal<SysUser> currentUser = new ThreadLocal<>();
    private static final ThreadLocal<Long> currentStoreId = new ThreadLocal<>();
    private static final ThreadLocal<String> currentStoreCode = new ThreadLocal<>();

    public static void setCurrentUser(SysUser user) {
        currentUser.set(user);
        if (user != null) {
            currentStoreId.set(user.getStoreId());
            currentStoreCode.set(user.getStoreCode());
        }
    }

    public static SysUser getCurrentUser() {
        return currentUser.get();
    }

    public static Long getCurrentUserId() {
        SysUser user = currentUser.get();
        return user != null ? user.getId() : null;
    }

    public static Long getCurrentStoreId() {
        return currentStoreId.get();
    }

    public static String getCurrentStoreCode() {
        return currentStoreCode.get();
    }

    public static boolean isHeadquartersUser() {
        SysUser user = currentUser.get();
        return user != null && user.getUserType() != null && user.getUserType() == 3;
    }

    public static boolean isStoreUser() {
        SysUser user = currentUser.get();
        return user != null && user.getStoreId() != null;
    }

    public static void clear() {
        currentUser.remove();
        currentStoreId.remove();
        currentStoreCode.remove();
    }
}
