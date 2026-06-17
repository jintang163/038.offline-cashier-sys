package com.cashier.server.interceptor;

import com.baomidou.mybatisplus.extension.plugins.handler.TenantLineHandler;
import com.cashier.server.common.UserContext;
import net.sf.jsqlparser.expression.Expression;
import net.sf.jsqlparser.expression.LongValue;
import net.sf.jsqlparser.expression.NullValue;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

@Component
public class TenantDataInterceptor implements TenantLineHandler {

    private static final Set<String> IGNORE_TABLES = new HashSet<>(Arrays.asList(
            "store", "store_erp_config", "store_sync_status", "store_aggregation_data",
            "sys_user", "sys_role", "sys_user_role", "erp_config", "erp_data_mapping",
            "erp_field_mapping", "erp_interface_mapping", "erp_product_sync_strategy",
            "erp_sync_log", "erp_sync_task", "fraud_detection_rule", "suspicious_store",
            "fraud_alert", "operation_lock_log", "member_level", "point_rule",
            "product_category", "member", "payment_record", "print_history",
            "print_rule", "print_template", "printer", "exchange_rate",
            "disaster_recovery_token", "cashier_device", "device_self_check_log",
            "device_log_upload"
    ));

    @Override
    public Expression getTenantId() {
        Long storeId = UserContext.getCurrentStoreId();
        if (storeId != null) {
            return new LongValue(storeId);
        }
        return new NullValue();
    }

    @Override
    public String getTenantIdColumn() {
        return "store_id";
    }

    @Override
    public boolean ignoreTable(String tableName) {
        if (UserContext.isHeadquartersUser()) {
            return true;
        }
        return IGNORE_TABLES.contains(tableName);
    }
}
