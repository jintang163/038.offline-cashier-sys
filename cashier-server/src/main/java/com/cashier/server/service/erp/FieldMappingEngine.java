package com.cashier.server.service.erp;

import cn.hutool.core.util.StrUtil;
import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.cashier.server.entity.erp.ErpFieldMapping;
import com.cashier.server.entity.erp.ErpInterfaceMapping;
import com.cashier.server.mapper.erp.ErpFieldMappingMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Component
public class FieldMappingEngine {

    private static final Logger log = LoggerFactory.getLogger(FieldMappingEngine.class);

    @Autowired
    private ErpFieldMappingMapper fieldMappingMapper;

    @Autowired
    private ExpressionEngine expressionEngine;

    public Map<String, Object> transformToErp(Object source, ErpInterfaceMapping interfaceMapping) {
        return transformToErp(source, interfaceMapping, null);
    }

    public Map<String, Object> transformToErp(Object source, ErpInterfaceMapping interfaceMapping, Map<String, Object> context) {
        if (source == null) {
            return new HashMap<>();
        }
        Map<String, Object> sourceMap = objectToMap(source);
        return transformToErp(sourceMap, interfaceMapping, context);
    }

    public Map<String, Object> transformToErp(Map<String, Object> sourceMap, ErpInterfaceMapping interfaceMapping) {
        return transformToErp(sourceMap, interfaceMapping, null);
    }

    public Map<String, Object> transformToErp(Map<String, Object> sourceMap, ErpInterfaceMapping interfaceMapping, Map<String, Object> context) {
        Map<String, Object> result = new HashMap<>();

        List<ErpFieldMapping> fieldMappings = getFieldMappings(interfaceMapping.getId(), "REQUEST");
        for (ErpFieldMapping mapping : fieldMappings) {
            try {
                Object value = getValueFromMap(sourceMap, mapping.getLocalField());

                if (value == null) {
                    value = mapping.getDefaultValue();
                }

                if (value == null && mapping.getIsRequired() != null && mapping.getIsRequired() == 1) {
                    log.warn("必填字段为空: localField={}, erpField={}", mapping.getLocalField(), mapping.getErpField());
                    continue;
                }

                if (value != null) {
                    value = convertType(value, mapping.getErpFieldType());
                }

                if (value != null && StrUtil.isNotBlank(mapping.getTransformExpression())) {
                    if (context == null) {
                        context = new HashMap<>();
                    }
                    context.putAll(sourceMap);
                    value = expressionEngine.execute(mapping.getTransformExpression(), value, context);
                }

                setValueToMap(result, mapping.getErpField(), value);
            } catch (Exception e) {
                log.error("字段映射转换失败: localField={}, erpField={}, error={}",
                        mapping.getLocalField(), mapping.getErpField(), e.getMessage());
            }
        }

        return result;
    }

    public Map<String, Object> transformFromErp(Map<String, Object> erpData, ErpInterfaceMapping interfaceMapping) {
        return transformFromErp(erpData, interfaceMapping, null);
    }

    public Map<String, Object> transformFromErp(Map<String, Object> erpData, ErpInterfaceMapping interfaceMapping, Map<String, Object> context) {
        Map<String, Object> result = new HashMap<>();

        List<ErpFieldMapping> fieldMappings = getFieldMappings(interfaceMapping.getId(), "RESPONSE");
        for (ErpFieldMapping mapping : fieldMappings) {
            try {
                Object value = getValueFromMap(erpData, mapping.getErpField());

                if (value == null) {
                    value = mapping.getDefaultValue();
                }

                if (value == null && mapping.getIsRequired() != null && mapping.getIsRequired() == 1) {
                    continue;
                }

                if (value != null) {
                    value = convertType(value, mapping.getLocalFieldType());
                }

                if (value != null && StrUtil.isNotBlank(mapping.getTransformExpression())) {
                    if (context == null) {
                        context = new HashMap<>();
                    }
                    context.putAll(erpData);
                    value = expressionEngine.execute(mapping.getTransformExpression(), value, context);
                }

                setValueToMap(result, mapping.getLocalField(), value);
            } catch (Exception e) {
                log.error("字段映射转换失败: erpField={}, localField={}, error={}",
                        mapping.getErpField(), mapping.getLocalField(), e.getMessage());
            }
        }

        return result;
    }

    public <T> T transformFromErp(Map<String, Object> erpData, ErpInterfaceMapping interfaceMapping, Class<T> clazz) {
        Map<String, Object> mapped = transformFromErp(erpData, interfaceMapping);
        return mapToObject(mapped, clazz);
    }

    private List<ErpFieldMapping> getFieldMappings(Long interfaceMappingId, String direction) {
        return fieldMappingMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ErpFieldMapping>()
                        .eq(ErpFieldMapping::getInterfaceMappingId, interfaceMappingId)
                        .eq(ErpFieldMapping::getMappingDirection, direction)
                        .eq(ErpFieldMapping::getStatus, 1)
                        .orderByAsc(ErpFieldMapping::getSort)
        );
    }

    @SuppressWarnings("unchecked")
    private Object getValueFromMap(Map<String, Object> map, String fieldPath) {
        if (map == null || StrUtil.isBlank(fieldPath)) {
            return null;
        }
        String[] paths = fieldPath.split("\\.");
        Object current = map;
        for (String path : paths) {
            if (current instanceof Map) {
                current = ((Map<String, Object>) current).get(path);
            } else {
                return null;
            }
            if (current == null) {
                return null;
            }
        }
        return current;
    }

    @SuppressWarnings("unchecked")
    private void setValueToMap(Map<String, Object> map, String fieldPath, Object value) {
        if (map == null || StrUtil.isBlank(fieldPath)) {
            return;
        }
        String[] paths = fieldPath.split("\\.");
        Map<String, Object> current = map;
        for (int i = 0; i < paths.length - 1; i++) {
            String path = paths[i];
            if (!current.containsKey(path) || !(current.get(path) instanceof Map)) {
                current.put(path, new HashMap<String, Object>());
            }
            current = (Map<String, Object>) current.get(path);
        }
        current.put(paths[paths.length - 1], value);
    }

    private Object convertType(Object value, String targetType) {
        if (value == null || StrUtil.isBlank(targetType)) {
            return value;
        }
        try {
            switch (targetType.toUpperCase()) {
                case "STRING":
                    return value.toString();
                case "INTEGER":
                    return value instanceof Number ? ((Number) value).intValue() : Integer.parseInt(value.toString().trim());
                case "LONG":
                    return value instanceof Number ? ((Number) value).longValue() : Long.parseLong(value.toString().trim());
                case "DECIMAL":
                    return value instanceof BigDecimal ? value : new BigDecimal(value.toString().trim());
                case "BOOLEAN":
                    if (value instanceof Boolean) return value;
                    String boolStr = value.toString().trim().toLowerCase();
                    return "true".equals(boolStr) || "1".equals(boolStr) || "yes".equals(boolStr);
                case "DATETIME":
                    if (value instanceof LocalDateTime) return value;
                    if (value instanceof String) {
                        return LocalDateTime.parse(value.toString(), DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                    }
                    return value;
                case "DATE":
                    if (value instanceof LocalDateTime) return ((LocalDateTime) value).toLocalDate();
                    return value;
                default:
                    return value;
            }
        } catch (Exception e) {
            log.warn("类型转换失败: value={}, targetType={}, error={}", value, targetType, e.getMessage());
            return value;
        }
    }

    private Map<String, Object> objectToMap(Object obj) {
        if (obj == null) {
            return new HashMap<>();
        }
        if (obj instanceof Map) {
            return (Map<String, Object>) obj;
        }
        try {
            String json = JSON.toJSONString(obj);
            return JSON.parseObject(json, Map.class);
        } catch (Exception e) {
            log.error("对象转Map失败", e);
            return new HashMap<>();
        }
    }

    private <T> T mapToObject(Map<String, Object> map, Class<T> clazz) {
        if (map == null) {
            return null;
        }
        String json = JSON.toJSONString(map);
        return JSON.parseObject(json, clazz);
    }
}
