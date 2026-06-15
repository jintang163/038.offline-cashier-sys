package com.cashier.server.service.erp;

import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.SecureUtil;
import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.cashier.server.common.BusinessException;
import com.cashier.server.config.ErpApiProperties;
import com.cashier.server.entity.order.Order;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class ErpApiClient {

    private static final Logger log = LoggerFactory.getLogger(ErpApiClient.class);

    @Autowired
    private ErpApiProperties erpApiProperties;

    private final RestTemplate restTemplate;

    public ErpApiClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(30000);
        factory.setReadTimeout(30000);
        this.restTemplate = new RestTemplate(factory);
    }

    public List<Map<String, Object>> getProducts() {
        log.info("开始调用ERP接口获取商品列表");
        Map<String, Object> response = executeWithRetry("/product/list", new HashMap<>(), HttpMethod.POST);
        Object data = response.get("data");
        if (data == null) {
            throw new BusinessException("ERP返回商品数据为空");
        }
        return JSON.parseArray(JSON.toJSONString(data), Map.class);
    }

    public List<Map<String, Object>> getStock() {
        log.info("开始调用ERP接口获取库存列表");
        Map<String, Object> response = executeWithRetry("/stock/list", new HashMap<>(), HttpMethod.POST);
        Object data = response.get("data");
        if (data == null) {
            throw new BusinessException("ERP返回库存数据为空");
        }
        return JSON.parseArray(JSON.toJSONString(data), Map.class);
    }

    public Map<String, Object> createOrder(Order order) {
        log.info("开始调用ERP接口创建订单, orderId={}, orderNo={}", order.getId(), order.getOrderNo());
        Map<String, Object> requestData = new HashMap<>();
        requestData.put("orderId", order.getId());
        requestData.put("orderNo", order.getOrderNo());
        requestData.put("erpOrderId", order.getErpOrderId());
        requestData.put("totalAmount", order.getTotalAmount());
        requestData.put("discountAmount", order.getDiscountAmount());
        requestData.put("payAmount", order.getPayAmount());
        requestData.put("payStatus", order.getPayStatus());
        requestData.put("orderStatus", order.getOrderStatus());
        requestData.put("cashierId", order.getCashierId());
        requestData.put("cashierName", order.getCashierName());
        requestData.put("remark", order.getRemark());
        requestData.put("createTime", order.getCreateTime());

        Map<String, Object> response = executeWithRetry("/order/create", requestData, HttpMethod.POST);
        log.info("ERP订单创建成功, orderId={}, response={}", order.getId(), response);
        return response;
    }

    public Map<String, Object> updateStock(String erpGoodsId, Integer stock) {
        log.info("开始调用ERP接口更新库存, erpGoodsId={}, stock={}", erpGoodsId, stock);
        Map<String, Object> requestData = new HashMap<>();
        requestData.put("erpGoodsId", erpGoodsId);
        requestData.put("stock", stock);

        Map<String, Object> response = executeWithRetry("/stock/update", requestData, HttpMethod.POST);
        log.info("ERP库存更新成功, erpGoodsId={}", erpGoodsId);
        return response;
    }

    public List<Map<String, Object>> getCategories() {
        log.info("开始调用ERP接口获取分类列表");
        Map<String, Object> response = executeWithRetry("/category/list", new HashMap<>(), HttpMethod.POST);
        Object data = response.get("data");
        if (data == null) {
            throw new BusinessException("ERP返回分类数据为空");
        }
        return JSON.parseArray(JSON.toJSONString(data), Map.class);
    }

    public Map<String, Object> pushSalesSummary(List<Map<String, Object>> summaryList) {
        log.info("开始调用ERP接口推送销售汇总, 数量={}", summaryList.size());
        Map<String, Object> requestData = new HashMap<>();
        requestData.put("summaryList", summaryList);

        Map<String, Object> response = executeWithRetry("/sales/summary/push", requestData, HttpMethod.POST);
        log.info("ERP销售汇总推送成功, 数量={}", summaryList.size());
        return response;
    }

    private Map<String, Object> executeWithRetry(String path, Map<String, Object> data, HttpMethod method) {
        int retryTimes = erpApiProperties.getRetryTimes();
        int retryInterval = erpApiProperties.getRetryInterval();
        Exception lastException = null;

        for (int i = 1; i <= retryTimes; i++) {
            try {
                log.info("ERP接口调用第 {} 次尝试, path={}", i, path);
                return executeRequest(path, data, method);
            } catch (Exception e) {
                lastException = e;
                log.warn("ERP接口调用第 {} 次失败, path={}, error={}", i, path, e.getMessage());
                if (i < retryTimes) {
                    try {
                        Thread.sleep(retryInterval);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new BusinessException("ERP接口调用重试被中断");
                    }
                }
            }
        }

        log.error("ERP接口调用 {} 次全部失败, path={}", retryTimes, path);
        throw new BusinessException("ERP接口调用失败: " + (lastException != null ? lastException.getMessage() : "未知错误"));
    }

    private Map<String, Object> executeRequest(String path, Map<String, Object> data, HttpMethod method) {
        String url = erpApiProperties.getBaseUrl() + path;
        long timestamp = System.currentTimeMillis();
        String sign = generateSign(erpApiProperties.getAppKey(), timestamp, erpApiProperties.getAppSecret());

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("appKey", erpApiProperties.getAppKey());
        requestBody.put("timestamp", timestamp);
        requestBody.put("sign", sign);
        requestBody.put("data", data);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Accept", MediaType.APPLICATION_JSON_VALUE);

        HttpEntity<String> entity = new HttpEntity<>(JSON.toJSONString(requestBody), headers);

        try {
            log.debug("发送ERP请求, url={}, body={}", url, requestBody);
            ResponseEntity<String> response = restTemplate.exchange(url, method, entity, String.class);

            if (response.getStatusCode() != HttpStatus.OK) {
                throw new BusinessException("ERP接口返回HTTP错误: " + response.getStatusCodeValue());
            }

            String responseBody = response.getBody();
            if (StrUtil.isBlank(responseBody)) {
                throw new BusinessException("ERP接口返回空响应");
            }

            JSONObject jsonResponse = JSON.parseObject(responseBody);
            Integer code = jsonResponse.getInteger("code");
            if (code == null || code != 200) {
                String message = jsonResponse.getString("message");
                throw new BusinessException("ERP接口返回业务错误: code=" + code + ", message=" + message);
            }

            Map<String, Object> result = new HashMap<>();
            result.put("code", code);
            result.put("message", jsonResponse.getString("message"));
            result.put("data", jsonResponse.get("data"));

            log.debug("ERP接口调用成功, path={}", path);
            return result;
        } catch (RestClientException e) {
            log.error("ERP接口HTTP请求失败, url={}, error={}", url, e.getMessage());
            throw new BusinessException("ERP接口HTTP请求失败: " + e.getMessage(), e);
        }
    }

    private String generateSign(String appKey, long timestamp, String appSecret) {
        String signStr = appKey + timestamp + appSecret;
        return SecureUtil.md5(signStr);
    }
}
