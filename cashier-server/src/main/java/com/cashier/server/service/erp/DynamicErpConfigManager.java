package com.cashier.server.service.erp;

import cn.hutool.core.util.StrUtil;
import com.cashier.server.common.BusinessException;
import com.cashier.server.entity.erp.ErpConfig;
import com.cashier.server.mapper.erp.ErpConfigMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class DynamicErpConfigManager {

    private static final Logger log = LoggerFactory.getLogger(DynamicErpConfigManager.class);

    @Autowired
    private ErpConfigMapper erpConfigMapper;

    private final Map<Long, ErpConfig> configCache = new ConcurrentHashMap<>();
    private final Map<String, ErpConfig> codeCache = new ConcurrentHashMap<>();
    private volatile ErpConfig defaultConfig;

    public ErpConfig getDefaultConfig() {
        if (defaultConfig != null && defaultConfig.getStatus() == 1) {
            return defaultConfig;
        }
        ErpConfig config = erpConfigMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ErpConfig>()
                        .eq(ErpConfig::getIsDefault, 1)
                        .eq(ErpConfig::getStatus, 1)
                        .last("LIMIT 1")
        );
        if (config == null) {
            throw new BusinessException("未找到默认ERP配置");
        }
        defaultConfig = config;
        configCache.put(config.getId(), config);
        codeCache.put(config.getConfigCode(), config);
        return config;
    }

    public ErpConfig getConfigById(Long configId) {
        if (configId == null) {
            return getDefaultConfig();
        }
        ErpConfig config = configCache.get(configId);
        if (config != null && config.getStatus() == 1) {
            return config;
        }
        config = erpConfigMapper.selectById(configId);
        if (config == null || config.getStatus() != 1) {
            log.warn("ERP配置不存在或已禁用: configId={}", configId);
            return getDefaultConfig();
        }
        configCache.put(configId, config);
        codeCache.put(config.getConfigCode(), config);
        return config;
    }

    public ErpConfig getConfigByCode(String configCode) {
        if (StrUtil.isBlank(configCode)) {
            return getDefaultConfig();
        }
        ErpConfig config = codeCache.get(configCode);
        if (config != null && config.getStatus() == 1) {
            return config;
        }
        config = erpConfigMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ErpConfig>()
                        .eq(ErpConfig::getConfigCode, configCode)
                        .eq(ErpConfig::getStatus, 1)
                        .last("LIMIT 1")
        );
        if (config == null) {
            log.warn("ERP配置不存在或已禁用: configCode={}", configCode);
            return getDefaultConfig();
        }
        configCache.put(config.getId(), config);
        codeCache.put(configCode, config);
        return config;
    }

    public List<ErpConfig> getAllConfigs() {
        return erpConfigMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ErpConfig>()
                        .eq(ErpConfig::getStatus, 1)
                        .orderByDesc(ErpConfig::getIsDefault)
                        .orderByAsc(ErpConfig::getConfigCode)
        );
    }

    public void refreshCache() {
        configCache.clear();
        codeCache.clear();
        defaultConfig = null;
        log.info("ERP配置缓存已全部刷新");
    }

    public void refreshCache(Long configId) {
        if (configId != null) {
            ErpConfig removed = configCache.remove(configId);
            if (removed != null) {
                codeCache.remove(removed.getConfigCode());
            }
            if (defaultConfig != null && defaultConfig.getId().equals(configId)) {
                defaultConfig = null;
            }
        }
        log.info("ERP配置缓存已刷新: configId={}", configId);
    }

    public boolean isValidAuthType(String authType) {
        if (StrUtil.isBlank(authType)) {
            return false;
        }
        switch (authType.toUpperCase()) {
            case "NONE":
            case "APP_KEY_SIGN":
            case "TOKEN":
            case "BASIC":
            case "OAUTH2":
                return true;
            default:
                return false;
        }
    }

    public boolean isValidErpType(String erpType) {
        if (StrUtil.isBlank(erpType)) {
            return false;
        }
        switch (erpType.toUpperCase()) {
            case "REST_API":
            case "MIDDLE_TABLE":
            case "CUSTOM":
                return true;
            default:
                return false;
        }
    }
}
