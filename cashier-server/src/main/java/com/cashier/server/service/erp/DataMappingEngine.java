package com.cashier.server.service.erp;

import cn.hutool.core.util.StrUtil;
import com.cashier.server.entity.erp.ErpDataMapping;
import com.cashier.server.mapper.erp.ErpDataMappingMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class DataMappingEngine {

    private static final Logger log = LoggerFactory.getLogger(DataMappingEngine.class);

    @Autowired
    private ErpDataMappingMapper dataMappingMapper;

    private final Map<String, Map<String, ErpDataMapping>> localToErpCache = new ConcurrentHashMap<>();
    private final Map<String, Map<String, ErpDataMapping>> erpToLocalCache = new ConcurrentHashMap<>();

    public String toErpCode(Long configId, String mappingType, String localCode) {
        return toErpCode(configId, mappingType, localCode, localCode);
    }

    public String toErpCode(Long configId, String mappingType, String localCode, String defaultValue) {
        if (configId == null || StrUtil.isBlank(mappingType) || StrUtil.isBlank(localCode)) {
            return defaultValue;
        }
        Map<String, ErpDataMapping> typeMap = getLocalToErpCache(configId, mappingType);
        ErpDataMapping mapping = typeMap.get(localCode);
        return mapping != null ? mapping.getErpCode() : defaultValue;
    }

    public String toLocalCode(Long configId, String mappingType, String erpCode) {
        return toLocalCode(configId, mappingType, erpCode, erpCode);
    }

    public String toLocalCode(Long configId, String mappingType, String erpCode, String defaultValue) {
        if (configId == null || StrUtil.isBlank(mappingType) || StrUtil.isBlank(erpCode)) {
            return defaultValue;
        }
        Map<String, ErpDataMapping> typeMap = getErpToLocalCache(configId, mappingType);
        ErpDataMapping mapping = typeMap.get(erpCode);
        return mapping != null ? mapping.getMappingCode() : defaultValue;
    }

    public Map<String, String> getLocalToErpMapping(Long configId, String mappingType) {
        Map<String, ErpDataMapping> typeMap = getLocalToErpCache(configId, mappingType);
        Map<String, String> result = new java.util.HashMap<>();
        for (Map.Entry<String, ErpDataMapping> entry : typeMap.entrySet()) {
            result.put(entry.getKey(), entry.getValue().getErpCode());
        }
        return result;
    }

    public Map<String, String> getErpToLocalMapping(Long configId, String mappingType) {
        Map<String, ErpDataMapping> typeMap = getErpToLocalCache(configId, mappingType);
        Map<String, String> result = new java.util.HashMap<>();
        for (Map.Entry<String, ErpDataMapping> entry : typeMap.entrySet()) {
            result.put(entry.getKey(), entry.getValue().getMappingCode());
        }
        return result;
    }

    public void refreshCache(Long configId) {
        if (configId == null) {
            localToErpCache.clear();
            erpToLocalCache.clear();
            return;
        }
        localToErpCache.keySet().removeIf(k -> k.startsWith(configId + "_"));
        erpToLocalCache.keySet().removeIf(k -> k.startsWith(configId + "_"));
    }

    public void refreshCache(Long configId, String mappingType) {
        if (configId == null || StrUtil.isBlank(mappingType)) {
            return;
        }
        String cacheKey = configId + "_" + mappingType;
        localToErpCache.remove(cacheKey);
        erpToLocalCache.remove(cacheKey);
    }

    private Map<String, ErpDataMapping> getLocalToErpCache(Long configId, String mappingType) {
        String cacheKey = configId + "_" + mappingType;
        return localToErpCache.computeIfAbsent(cacheKey, k -> {
            List<ErpDataMapping> mappings = dataMappingMapper.selectList(
                    new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ErpDataMapping>()
                            .eq(ErpDataMapping::getConfigId, configId)
                            .eq(ErpDataMapping::getMappingType, mappingType)
                            .eq(ErpDataMapping::getStatus, 1)
            );
            Map<String, ErpDataMapping> map = new ConcurrentHashMap<>();
            for (ErpDataMapping m : mappings) {
                map.put(m.getMappingCode(), m);
            }
            return map;
        });
    }

    private Map<String, ErpDataMapping> getErpToLocalCache(Long configId, String mappingType) {
        String cacheKey = configId + "_" + mappingType;
        return erpToLocalCache.computeIfAbsent(cacheKey, k -> {
            List<ErpDataMapping> mappings = dataMappingMapper.selectList(
                    new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ErpDataMapping>()
                            .eq(ErpDataMapping::getConfigId, configId)
                            .eq(ErpDataMapping::getMappingType, mappingType)
                            .eq(ErpDataMapping::getStatus, 1)
            );
            Map<String, ErpDataMapping> map = new ConcurrentHashMap<>();
            for (ErpDataMapping m : mappings) {
                map.put(m.getErpCode(), m);
            }
            return map;
        });
    }
}
