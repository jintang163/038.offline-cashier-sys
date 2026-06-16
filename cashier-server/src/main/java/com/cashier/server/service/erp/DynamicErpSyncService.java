package com.cashier.server.service.erp;

import cn.hutool.core.util.StrUtil;
import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import cn.hutool.http.HttpUtil;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.cashier.server.entity.erp.ErpConfig;
import com.cashier.server.entity.erp.ErpFieldMapping;
import com.cashier.server.entity.erp.ErpInterfaceMapping;
import com.cashier.server.entity.erp.ErpSyncLog;
import com.cashier.server.service.erp.ErpFieldMappingService;
import com.cashier.server.service.erp.ErpInterfaceMappingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DynamicErpSyncService {

    private static final Logger log = LoggerFactory.getLogger(DynamicErpSyncService.class);

    @Autowired
    private DynamicErpConfigManager configManager;

    @Autowired
    private ErpInterfaceMappingService interfaceMappingService;

    @Autowired
    private ErpFieldMappingService fieldMappingService;

    @Autowired
    private FieldMappingEngine fieldMappingEngine;

    @Autowired
    private DataMappingEngine dataMappingEngine;

    @Autowired
    private ErpSyncLogService syncLogService;

    public JSONObject executeDynamicSync(Long configId, String businessType, String syncDirection,
                                          String syncType, JSONObject businessData, String businessId) {
        ErpConfig config = configId != null ? configManager.getConfigById(configId) : configManager.getDefaultConfig();
        if (config == null) {
            throw new RuntimeException("未找到有效的ERP配置，请先在后台配置");
        }
        return executeDynamicSync(config, businessType, syncDirection, syncType, businessData, businessId);
    }

    public JSONObject executeDynamicSync(ErpConfig config, String businessType, String syncDirection,
                                          String syncType, JSONObject businessData, String businessId) {
        ErpInterfaceMapping interfaceMapping = interfaceMappingService.getByBusinessType(
                config.getId(), businessType, syncDirection);
        if (interfaceMapping == null) {
            throw new RuntimeException("未找到业务类型[" + businessType + "]的接口映射配置");
        }

        List<ErpFieldMapping> fieldMappings = fieldMappingService.getByInterfaceMappingId(
                interfaceMapping.getId(), syncDirection);

        ErpSyncLog syncLog = syncLogService.createLog(config.getId(), businessType, syncDirection, syncType);
        if (businessId != null) {
            syncLogService.updateBusinessId(syncLog.getId(), businessId);
        }

        long startTime = System.currentTimeMillis();
        try {
            JSONObject requestBody = buildRequestBody(businessData, fieldMappings, config.getId(), businessType);

            String fullUrl = buildFullUrl(config, interfaceMapping, businessData);
            Map<String, String> headers = buildHeaders(config);

            syncLogService.updateLogStart(syncLog.getId(), fullUrl, interfaceMapping.getHttpMethod(),
                    requestBody.toString());

            String requestBodyStr = requestBody.toString();
            log.info("[动态ERP同步] 业务类型={}, 方向={}, URL={}, 请求体={}", businessType, syncDirection, fullUrl, requestBodyStr);

            HttpRequest request = buildHttpRequest(fullUrl, interfaceMapping.getHttpMethod(), headers, requestBodyStr, config);
            HttpResponse response = request.execute();

            int costTime = (int) (System.currentTimeMillis() - startTime);
            String responseBody = response.body();

            if (response.isOk()) {
                JSONObject parsedResponse = parseResponse(responseBody, interfaceMapping, fieldMappings, config.getId(), businessType);
                syncLogService.updateLogSuccess(syncLog.getId(), responseBody, costTime);
                log.info("[动态ERP同步] 成功, 业务类型={}, 耗时={}ms", businessType, costTime);
                return parsedResponse;
            } else {
                syncLogService.updateLogFail(syncLog.getId(), responseBody,
                        String.valueOf(response.getStatus()), "HTTP " + response.getStatus(), costTime);
                throw new RuntimeException("ERP接口调用失败: HTTP " + response.getStatus() + ", " + responseBody);
            }
        } catch (Exception e) {
            int costTime = (int) (System.currentTimeMillis() - startTime);
            log.error("[动态ERP同步] 失败, 业务类型={}, 错误={}", businessType, e.getMessage(), e);
            syncLogService.updateLogFail(syncLog.getId(), null, "SYSTEM_ERROR", e.getMessage(), costTime);
            throw e instanceof RuntimeException ? (RuntimeException) e : new RuntimeException(e.getMessage(), e);
        }
    }

    public JSONObject retryByLogId(Long logId) {
        ErpSyncLog syncLog = syncLogService.getById(logId);
        if (syncLog == null) {
            throw new RuntimeException("未找到同步日志记录: " + logId);
        }

        ErpConfig config = configManager.getConfigById(syncLog.getConfigId());
        if (config == null) {
            throw new RuntimeException("ERP配置不存在, configId=" + syncLog.getConfigId());
        }

        ErpInterfaceMapping interfaceMapping = interfaceMappingService.getByBusinessType(
                syncLog.getConfigId(), syncLog.getBusinessType(), syncLog.getSyncDirection());
        if (interfaceMapping == null) {
            throw new RuntimeException("未找到业务类型[" + syncLog.getBusinessType() + "]的接口映射配置");
        }

        long startTime = System.currentTimeMillis();
        try {
            syncLogService.resetLogForRetry(logId);

            JSONObject businessData;
            if (StrUtil.isNotBlank(syncLog.getRequestBody())) {
                businessData = JSONUtil.parseObj(syncLog.getRequestBody());
            } else {
                businessData = new JSONObject();
            }

            String fullUrl = syncLog.getRequestUrl() != null ? syncLog.getRequestUrl()
                    : buildFullUrl(config, interfaceMapping, businessData);
            Map<String, String> headers = buildHeaders(config);
            String requestMethod = StrUtil.isNotBlank(syncLog.getRequestMethod()) ? syncLog.getRequestMethod() : interfaceMapping.getHttpMethod();

            syncLogService.updateLogStart(logId, fullUrl, requestMethod, businessData.toString());
            log.info("[ERP重试] 日志ID={}, 业务类型={}, URL={}", logId, syncLog.getBusinessType(), fullUrl);

            HttpRequest request = buildHttpRequest(fullUrl, requestMethod, headers, businessData.toString(), config);
            HttpResponse response = request.execute();

            int costTime = (int) (System.currentTimeMillis() - startTime);
            String responseBody = response.body();

            if (response.isOk()) {
                List<ErpFieldMapping> fieldMappings = fieldMappingService.getByInterfaceMappingId(
                        interfaceMapping.getId(), syncLog.getSyncDirection());
                JSONObject parsedResponse = parseResponse(responseBody, interfaceMapping, fieldMappings,
                        syncLog.getConfigId(), syncLog.getBusinessType());
                syncLogService.updateLogSuccess(logId, responseBody, costTime);
                log.info("[ERP重试] 成功, 日志ID={}, 耗时={}ms", logId, costTime);
                return parsedResponse;
            } else {
                syncLogService.updateLogFail(logId, responseBody,
                        String.valueOf(response.getStatus()), "HTTP " + response.getStatus() + " [重试]", costTime);
                throw new RuntimeException("ERP重试失败: HTTP " + response.getStatus() + ", " + responseBody);
            }
        } catch (Exception e) {
            int costTime = (int) (System.currentTimeMillis() - startTime);
            log.error("[ERP重试] 失败, 日志ID={}, 错误={}", logId, e.getMessage(), e);
            syncLogService.updateLogFail(logId, null, "RETRY_ERROR", e.getMessage() + " [重试]", costTime);
            throw e instanceof RuntimeException ? (RuntimeException) e : new RuntimeException(e.getMessage(), e);
        }
    }

    public int batchRetry(List<Long> logIds) {
        int successCount = 0;
        for (Long logId : logIds) {
            try {
                retryByLogId(logId);
                successCount++;
            } catch (Exception e) {
                log.warn("[批量重试] 日志ID={} 失败: {}", logId, e.getMessage());
            }
        }
        return successCount;
    }

    public JSONObject buildRequestBody(JSONObject businessData, List<ErpFieldMapping> fieldMappings,
                                        Long configId, String businessType) {
        return fieldMappingEngine.mapRequest(businessData, fieldMappings, configId, businessType, dataMappingEngine);
    }

    public JSONObject parseResponse(String responseBody, ErpInterfaceMapping interfaceMapping,
                                     List<ErpFieldMapping> fieldMappings, Long configId, String businessType) {
        JSONObject rawResponse = JSONUtil.parseObj(responseBody);
        if (StrUtil.isNotBlank(interfaceMapping.getResponseDataPath())) {
            Object data = getNestedValue(rawResponse, interfaceMapping.getResponseDataPath());
            if (data instanceof JSONObject) {
                rawResponse = (JSONObject) data;
            } else if (data != null) {
                rawResponse = JSONUtil.parseObj(JSONUtil.toJsonStr(data));
            }
        }
        return fieldMappingEngine.mapResponse(rawResponse, fieldMappings, configId, businessType, dataMappingEngine);
    }

    private Object getNestedValue(JSONObject obj, String path) {
        if (StrUtil.isBlank(path)) return obj;
        String[] keys = path.split("\\.");
        Object current = obj;
        for (String key : keys) {
            if (current instanceof JSONObject) {
                current = ((JSONObject) current).get(key);
            } else {
                return null;
            }
        }
        return current;
    }

    private String buildFullUrl(ErpConfig config, ErpInterfaceMapping interfaceMapping, JSONObject businessData) {
        String baseUrl = config.getBaseUrl();
        String interfacePath = interfaceMapping.getInterfacePath();
        if (interfacePath.contains("{")) {
            for (String key : businessData.keySet()) {
                String placeholder = "{" + key + "}";
                if (interfacePath.contains(placeholder)) {
                    Object val = businessData.get(key);
                    interfacePath = interfacePath.replace(placeholder, val != null ? val.toString() : "");
                }
            }
        }
        if (!baseUrl.endsWith("/") && !interfacePath.startsWith("/")) {
            baseUrl = baseUrl + "/";
        }
        return baseUrl + interfacePath;
    }

    private Map<String, String> buildHeaders(ErpConfig config) {
        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", "application/json;charset=UTF-8");
        headers.put("Accept", "application/json");

        String authType = config.getAuthType();
        if ("NONE".equals(authType)) {
            return headers;
        }
        if ("BASIC".equals(authType)) {
            String credentials = config.getUsername() + ":" + config.getPassword();
            String encoded = Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
            headers.put("Authorization", "Basic " + encoded);
        } else if ("TOKEN".equals(authType) || "OAUTH2".equals(authType)) {
            if (StrUtil.isNotBlank(config.getToken())) {
                headers.put("Authorization", "Bearer " + config.getToken());
            }
        } else if ("APP_KEY_SIGN".equals(authType)) {
            if (StrUtil.isNotBlank(config.getAppKey())) {
                headers.put("X-App-Key", config.getAppKey());
            }
            headers.put("X-Timestamp", String.valueOf(System.currentTimeMillis()));
        }
        return headers;
    }

    private HttpRequest buildHttpRequest(String url, String method, Map<String, String> headers,
                                          String body, ErpConfig config) {
        Integer timeout = config.getTimeout() != null ? config.getTimeout() : 30000;
        HttpRequest request = HttpUtil.createRequest(
                cn.hutool.http.Method.valueOf(method != null ? method.toUpperCase() : "POST"), url);
        request.timeout(timeout);
        for (Map.Entry<String, String> entry : headers.entrySet()) {
            request.header(entry.getKey(), entry.getValue());
        }
        if (body != null && !body.isEmpty() && !"GET".equalsIgnoreCase(method)) {
            request.body(body);
        }
        return request;
    }
}
