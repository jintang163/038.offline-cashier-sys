package com.cashier.server.service.tax;

import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.SecureUtil;
import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.cashier.server.common.BusinessException;
import com.cashier.server.config.TaxControlProperties;
import com.cashier.server.entity.order.ElectronicInvoice;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Component
public class TaxControlApiClient {

    private static final Logger log = LoggerFactory.getLogger(TaxControlApiClient.class);

    @Autowired
    private TaxControlProperties taxControlProperties;

    private final RestTemplate restTemplate;

    public TaxControlApiClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(30000);
        factory.setReadTimeout(30000);
        this.restTemplate = new RestTemplate(factory);
    }

    public Map<String, Object> issueInvoice(ElectronicInvoice invoice) {
        log.info("开始调用税控接口开具电子发票, invoiceNo={}", invoice.getInvoiceNo());
        
        Map<String, Object> requestData = new HashMap<>();
        requestData.put("invoiceNo", invoice.getInvoiceNo());
        requestData.put("orderNo", invoice.getOrderNo());
        requestData.put("sellerTaxNo", invoice.getShopTaxNo() != null ? invoice.getShopTaxNo() : taxControlProperties.getSellerTaxNo());
        requestData.put("sellerName", invoice.getShopName() != null ? invoice.getShopName() : taxControlProperties.getSellerName());
        requestData.put("sellerAddress", taxControlProperties.getSellerAddress());
        requestData.put("sellerBank", taxControlProperties.getSellerBank());
        requestData.put("sellerPhone", taxControlProperties.getSellerPhone());
        requestData.put("buyerName", invoice.getBuyerName());
        requestData.put("buyerTaxNo", invoice.getBuyerTaxNo());
        requestData.put("buyerPhone", invoice.getBuyerPhone());
        requestData.put("buyerEmail", invoice.getBuyerEmail());
        requestData.put("buyerAddress", invoice.getBuyerAddress());
        requestData.put("buyerBank", invoice.getBuyerBank());
        requestData.put("totalAmount", invoice.getTotalAmount());
        requestData.put("amount", invoice.getAmount());
        requestData.put("taxAmount", invoice.getTaxAmount());
        requestData.put("taxRate", invoice.getTaxRate());
        requestData.put("invoiceType", invoice.getInvoiceType());
        requestData.put("invoiceTitleType", invoice.getInvoiceTitleType());
        requestData.put("remark", invoice.getRemark());
        requestData.put("cashierName", invoice.getCashierName());

        Map<String, Object> response = executeWithRetry("/invoice/issue", requestData, HttpMethod.POST);
        log.info("税控发票开具接口返回, invoiceNo={}, response={}", invoice.getInvoiceNo(), response);
        return response;
    }

    public Map<String, Object> queryInvoiceStatus(String invoiceNo) {
        log.info("开始调用税控接口查询发票状态, invoiceNo={}", invoiceNo);
        
        Map<String, Object> requestData = new HashMap<>();
        requestData.put("invoiceNo", invoiceNo);

        Map<String, Object> response = executeWithRetry("/invoice/query", requestData, HttpMethod.POST);
        log.info("税控发票状态查询接口返回, invoiceNo={}, response={}", invoiceNo, response);
        return response;
    }

    public Map<String, Object> downloadInvoicePdf(String invoiceNo) {
        log.info("开始调用税控接口下载发票PDF, invoiceNo={}", invoiceNo);
        
        Map<String, Object> requestData = new HashMap<>();
        requestData.put("invoiceNo", invoiceNo);

        Map<String, Object> response = executeWithRetry("/invoice/download", requestData, HttpMethod.POST);
        log.info("税控发票PDF下载接口返回, invoiceNo={}", invoiceNo);
        return response;
    }

    public Map<String, Object> redFlushInvoice(String invoiceNo, String redReason) {
        log.info("开始调用税控接口红冲发票, invoiceNo={}, reason={}", invoiceNo, redReason);
        
        Map<String, Object> requestData = new HashMap<>();
        requestData.put("invoiceNo", invoiceNo);
        requestData.put("redReason", redReason);

        Map<String, Object> response = executeWithRetry("/invoice/red", requestData, HttpMethod.POST);
        log.info("税控发票红冲接口返回, invoiceNo={}, response={}", invoiceNo, response);
        return response;
    }

    public Map<String, Object> pushInvoiceToCustomer(String invoiceNo, String phone, String email) {
        return pushInvoiceToCustomer(invoiceNo, phone, email, null);
    }

    public Map<String, Object> pushInvoiceToCustomer(String invoiceNo, String phone, String email, String pdfUrl) {
        log.info("开始调用税控接口推送发票给顾客, invoiceNo={}, phone={}, email={}", invoiceNo, phone, email);
        
        Map<String, Object> requestData = new HashMap<>();
        requestData.put("invoiceNo", invoiceNo);
        requestData.put("phone", phone);
        requestData.put("email", email);
        if (pdfUrl != null && !pdfUrl.isEmpty()) {
            requestData.put("pdfUrl", pdfUrl);
        }

        Map<String, Object> response = executeWithRetry("/invoice/push", requestData, HttpMethod.POST);
        log.info("税控发票推送接口返回, invoiceNo={}, response={}", invoiceNo, response);
        return response;
    }

    private Map<String, Object> executeWithRetry(String url, Map<String, Object> requestData, HttpMethod method) {
        int retryTimes = taxControlProperties.getRetryTimes();
        int retryInterval = taxControlProperties.getRetryInterval();
        Exception lastException = null;

        for (int i = 0; i < retryTimes; i++) {
            try {
                return execute(url, requestData, method);
            } catch (Exception e) {
                lastException = e;
                log.warn("税控接口调用失败, 第{}次重试, url={}, error={}", i + 1, url, e.getMessage());
                if (i < retryTimes - 1) {
                    try {
                        Thread.sleep(retryInterval);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new BusinessException("税控接口调用中断: " + ie.getMessage());
                    }
                }
            }
        }

        throw new BusinessException("税控接口调用失败, 已重试" + retryTimes + "次: " + (lastException != null ? lastException.getMessage() : "未知错误"));
    }

    private Map<String, Object> execute(String url, Map<String, Object> requestData, HttpMethod method) {
        String fullUrl = taxControlProperties.getBaseUrl() + url;
        long timestamp = System.currentTimeMillis();
        String sign = generateSign(requestData, timestamp);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("App-Key", taxControlProperties.getAppKey());
        headers.set("Timestamp", String.valueOf(timestamp));
        headers.set("Sign", sign);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestData, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(fullUrl, method, entity, String.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new BusinessException("税控接口返回HTTP错误: " + response.getStatusCode());
            }

            String responseBody = response.getBody();
            if (StrUtil.isBlank(responseBody)) {
                throw new BusinessException("税控接口返回空数据");
            }

            JSONObject jsonObject = JSON.parseObject(responseBody);
            Integer code = jsonObject.getInteger("code");
            if (code == null || code != 200) {
                String message = jsonObject.getString("message");
                throw new BusinessException("税控接口返回业务错误: " + (message != null ? message : "未知错误"));
            }

            return jsonObject;
        } catch (RestClientException e) {
            throw new BusinessException("税控接口网络错误: " + e.getMessage());
        }
    }

    private String generateSign(Map<String, Object> requestData, long timestamp) {
        String jsonStr = JSON.toJSONString(requestData);
        String signStr = taxControlProperties.getAppKey() + jsonStr + timestamp + taxControlProperties.getAppSecret();
        return SecureUtil.md5(signStr).toUpperCase();
    }
}
