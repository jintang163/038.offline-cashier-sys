package com.cashier.server.service.erp;

import cn.hutool.core.codec.Base64;
import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.SecureUtil;
import cn.hutool.json.JSONUtil;
import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.cashier.server.common.BusinessException;
import com.cashier.server.config.ErpApiProperties;
import com.cashier.server.entity.erp.ErpConfig;
import com.cashier.server.entity.erp.ErpInterfaceMapping;
import com.cashier.server.entity.erp.ErpSyncLog;
import com.cashier.server.entity.member.MemberCardRecord;
import com.cashier.server.entity.member.PointRecord;
import com.cashier.server.entity.order.DailyReport;
import com.cashier.server.entity.order.Order;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class ErpApiClient {

    private static final Logger log = LoggerFactory.getLogger(ErpApiClient.class);

    @Autowired
    private ErpApiProperties erpApiProperties;

    @Autowired
    private DynamicErpConfigManager dynamicErpConfigManager;

    @Autowired
    private ErpSyncLogService syncLogService;

    @Autowired
    private DynamicErpSyncService dynamicErpSyncService;

    @Autowired
    private ErpInterfaceMappingService interfaceMappingService;

    private final RestTemplate restTemplate;

    public ErpApiClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(30000);
        factory.setReadTimeout(30000);
        this.restTemplate = new RestTemplate(factory);
    }

    private ErpConfig resolveConfig() {
        try {
            return dynamicErpConfigManager.getDefaultConfig();
        } catch (Exception e) {
            log.warn("动态ERP配置不可用，使用静态配置: {}", e.getMessage());
            return null;
        }
    }

    private ErpConfig resolveConfig(Long configId) {
        if (configId != null) {
            try {
                return dynamicErpConfigManager.getConfigById(configId);
            } catch (Exception e) {
                log.warn("获取指定ID的ERP配置失败, configId={}, error={}", configId, e.getMessage());
            }
        }
        return resolveConfig();
    }

    private boolean hasDynamicMapping(Long configId, String businessType, String syncDirection) {
        try {
            ErpConfig config = resolveConfig(configId);
            if (config == null || config.getId() == null) {
                return false;
            }
            ErpInterfaceMapping mapping = interfaceMappingService.getByBusinessType(
                    config.getId(), businessType, syncDirection);
            return mapping != null && mapping.getStatus() != null && mapping.getStatus() == 1;
        } catch (Exception e) {
            log.warn("检查动态映射配置失败, businessType={}, error={}", businessType, e.getMessage());
            return false;
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> executeDynamicPush(Long configId, String businessType,
                                                    Object businessData, String businessId, ErpSyncLog syncLog) {
        try {
            cn.hutool.json.JSONObject dataObj;
            if (businessData instanceof Map) {
                dataObj = JSONUtil.parseObj(businessData);
            } else {
                dataObj = JSONUtil.parseObj(JSON.toJSONString(businessData));
            }

            cn.hutool.json.JSONObject result = dynamicErpSyncService.executeDynamicSync(
                    configId, businessType, "PUSH", "AUTO", dataObj, businessId);

            return JSON.parseObject(JSONUtil.toJsonStr(result), Map.class);
        } catch (Exception e) {
            log.error("动态ERP推送失败, businessType={}, error={}", businessType, e.getMessage(), e);
            throw e instanceof RuntimeException ? (RuntimeException) e : new BusinessException(e.getMessage(), e);
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> executeDynamicPullList(Long configId, String businessType,
                                                              Object businessData, String businessId) {
        try {
            cn.hutool.json.JSONObject dataObj;
            if (businessData instanceof Map) {
                dataObj = JSONUtil.parseObj(businessData);
            } else if (businessData != null) {
                dataObj = JSONUtil.parseObj(JSON.toJSONString(businessData));
            } else {
                dataObj = new cn.hutool.json.JSONObject();
            }

            cn.hutool.json.JSONObject result = dynamicErpSyncService.executeDynamicSync(
                    configId, businessType, "PULL", "AUTO", dataObj, businessId);

            Object data = result.get("data");
            if (data == null) {
                return new ArrayList<>();
            }
            if (data instanceof List) {
                return (List<Map<String, Object>>) JSON.parseArray(
                        JSONUtil.toJsonStr(data), Map.class);
            }
            List<Map<String, Object>> list = new ArrayList<>();
            list.add(JSON.parseObject(JSONUtil.toJsonStr(data), Map.class));
            return list;
        } catch (Exception e) {
            log.error("动态ERP拉取列表失败, businessType={}, error={}", businessType, e.getMessage(), e);
            throw e instanceof RuntimeException ? (RuntimeException) e : new BusinessException(e.getMessage(), e);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> executeDynamicPullOne(Long configId, String businessType,
                                                       Object businessData, String businessId) {
        try {
            cn.hutool.json.JSONObject dataObj;
            if (businessData instanceof Map) {
                dataObj = JSONUtil.parseObj(businessData);
            } else if (businessData != null) {
                dataObj = JSONUtil.parseObj(JSON.toJSONString(businessData));
            } else {
                dataObj = new cn.hutool.json.JSONObject();
            }

            cn.hutool.json.JSONObject result = dynamicErpSyncService.executeDynamicSync(
                    configId, businessType, "PULL", "AUTO", dataObj, businessId);

            Object data = result.get("data");
            if (data == null) {
                return null;
            }
            return JSON.parseObject(JSONUtil.toJsonStr(data), Map.class);
        } catch (Exception e) {
            log.error("动态ERP拉取单条失败, businessType={}, error={}", businessType, e.getMessage(), e);
            throw e instanceof RuntimeException ? (RuntimeException) e : new BusinessException(e.getMessage(), e);
        }
    }

    public List<Map<String, Object>> getProducts() {
        return getProducts(null);
    }

    public List<Map<String, Object>> getProducts(Long configId) {
        log.info("开始调用ERP接口获取商品列表");

        if (hasDynamicMapping(configId, "PRODUCT_LIST", "PULL")) {
            log.info("使用动态映射配置调用商品列表接口");
            return executeDynamicPullList(configId, "PRODUCT_LIST", null, null);
        }

        ErpSyncLog syncLog = createSyncLog(configId, "PRODUCT_LIST", "PULL", "AUTO");
        try {
            Map<String, Object> response = executeWithRetry("/product/list", new HashMap<>(), HttpMethod.POST, configId, syncLog);
            Object data = response.get("data");
            if (data == null) {
                throw new BusinessException("ERP返回商品数据为空");
            }
            updateLogSuccess(syncLog, JSON.toJSONString(response));
            return JSON.parseArray(JSON.toJSONString(data), Map.class);
        } catch (Exception e) {
            updateLogFail(syncLog, null, null, e.getMessage());
            throw e;
        }
    }

    public List<Map<String, Object>> getStock() {
        return getStock(null);
    }

    public List<Map<String, Object>> getStock(Long configId) {
        log.info("开始调用ERP接口获取库存列表");

        if (hasDynamicMapping(configId, "STOCK_LIST", "PULL")) {
            log.info("使用动态映射配置调用库存列表接口");
            return executeDynamicPullList(configId, "STOCK_LIST", null, null);
        }

        ErpSyncLog syncLog = createSyncLog(configId, "STOCK_LIST", "PULL", "AUTO");
        try {
            Map<String, Object> response = executeWithRetry("/stock/list", new HashMap<>(), HttpMethod.POST, configId, syncLog);
            Object data = response.get("data");
            if (data == null) {
                throw new BusinessException("ERP返回库存数据为空");
            }
            updateLogSuccess(syncLog, JSON.toJSONString(response));
            return JSON.parseArray(JSON.toJSONString(data), Map.class);
        } catch (Exception e) {
            updateLogFail(syncLog, null, null, e.getMessage());
            throw e;
        }
    }

    public Map<String, Object> createOrder(Order order) {
        return createOrder(order, null);
    }

    public Map<String, Object> createOrder(Order order, Long configId) {
        log.info("开始调用ERP接口创建订单, orderId={}, orderNo={}", order.getId(), order.getOrderNo());

        if (hasDynamicMapping(configId, "ORDER_CREATE", "PUSH")) {
            log.info("使用动态映射配置创建订单");
            Map<String, Object> orderMap = buildOrderMap(order);
            return executeDynamicPush(configId, "ORDER_CREATE", orderMap, order.getOrderNo(), null);
        }

        ErpSyncLog syncLog = createSyncLog(configId, "ORDER_CREATE", "PUSH", "AUTO");
        syncLogService.updateBusinessId(syncLog.getId(), order.getOrderNo());
        try {
            Map<String, Object> requestData = buildOrderMap(order);
            Map<String, Object> response = executeWithRetry("/order/create", requestData, HttpMethod.POST, configId, syncLog);
            log.info("ERP订单创建成功, orderId={}, response={}", order.getId(), response);
            updateLogSuccess(syncLog, JSON.toJSONString(response));
            return response;
        } catch (Exception e) {
            updateLogFail(syncLog, null, null, e.getMessage());
            throw e;
        }
    }

    private Map<String, Object> buildOrderMap(Order order) {
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
        return requestData;
    }

    public Map<String, Object> updateStock(String erpGoodsId, Integer stock) {
        return updateStock(erpGoodsId, stock, null);
    }

    public Map<String, Object> updateStock(String erpGoodsId, Integer stock, Long configId) {
        log.info("开始调用ERP接口更新库存, erpGoodsId={}, stock={}", erpGoodsId, stock);
        ErpSyncLog syncLog = createSyncLog(configId, "STOCK_UPDATE", "PUSH", "AUTO");
        syncLogService.updateBusinessId(syncLog.getId(), erpGoodsId);
        try {
            Map<String, Object> requestData = new HashMap<>();
            requestData.put("erpGoodsId", erpGoodsId);
            requestData.put("stock", stock);

            Map<String, Object> response = executeWithRetry("/stock/update", requestData, HttpMethod.POST, configId, syncLog);
            updateLogSuccess(syncLog, JSON.toJSONString(response));
            return response;
        } catch (Exception e) {
            updateLogFail(syncLog, null, null, e.getMessage());
            throw e;
        }
    }

    public List<Map<String, Object>> getCategories() {
        return getCategories(null);
    }

    public List<Map<String, Object>> getCategories(Long configId) {
        log.info("开始调用ERP接口获取分类列表");
        ErpSyncLog syncLog = createSyncLog(configId, "CATEGORY_LIST", "PULL", "AUTO");
        try {
            Map<String, Object> response = executeWithRetry("/category/list", new HashMap<>(), HttpMethod.POST, configId, syncLog);
            Object data = response.get("data");
            if (data == null) {
                throw new BusinessException("ERP返回分类数据为空");
            }
            updateLogSuccess(syncLog, JSON.toJSONString(response));
            return JSON.parseArray(JSON.toJSONString(data), Map.class);
        } catch (Exception e) {
            updateLogFail(syncLog, null, null, e.getMessage());
            throw e;
        }
    }

    public Map<String, Object> pushSalesSummary(List<Map<String, Object>> summaryList) {
        return pushSalesSummary(summaryList, null);
    }

    public Map<String, Object> pushSalesSummary(List<Map<String, Object>> summaryList, Long configId) {
        log.info("开始调用ERP接口推送销售汇总, 数量={}", summaryList.size());
        ErpSyncLog syncLog = createSyncLog(configId, "SALES_SUMMARY_PUSH", "PUSH", "AUTO");
        try {
            Map<String, Object> requestData = new HashMap<>();
            requestData.put("summaryList", summaryList);

            Map<String, Object> response = executeWithRetry("/sales/summary/push", requestData, HttpMethod.POST, configId, syncLog);
            updateLogSuccess(syncLog, JSON.toJSONString(response));
            return response;
        } catch (Exception e) {
            updateLogFail(syncLog, null, null, e.getMessage());
            throw e;
        }
    }

    public List<Map<String, Object>> getMembers() {
        return getMembers(null);
    }

    public List<Map<String, Object>> getMembers(Long configId) {
        log.info("开始调用ERP接口获取会员列表");
        ErpSyncLog syncLog = createSyncLog(configId, "MEMBER_LIST", "PULL", "AUTO");
        try {
            Map<String, Object> response = executeWithRetry("/member/list", new HashMap<>(), HttpMethod.POST, configId, syncLog);
            Object data = response.get("data");
            if (data == null) {
                updateLogSuccess(syncLog, JSON.toJSONString(response));
                return null;
            }
            updateLogSuccess(syncLog, JSON.toJSONString(response));
            return JSON.parseArray(JSON.toJSONString(data), Map.class);
        } catch (Exception e) {
            updateLogFail(syncLog, null, null, e.getMessage());
            throw e;
        }
    }

    public Map<String, Object> pushMemberPoints(List<PointRecord> pointRecords) {
        return pushMemberPoints(pointRecords, null);
    }

    public Map<String, Object> pushMemberPoints(List<PointRecord> pointRecords, Long configId) {
        log.info("开始调用ERP接口推送积分变动, 数量={}", pointRecords.size());
        ErpSyncLog syncLog = createSyncLog(configId, "MEMBER_POINTS_PUSH", "PUSH", "AUTO");
        try {
            Map<String, Object> requestData = new HashMap<>();
            requestData.put("pointRecords", pointRecords);

            Map<String, Object> response = executeWithRetry("/member/points/push", requestData, HttpMethod.POST, configId, syncLog);
            updateLogSuccess(syncLog, JSON.toJSONString(response));
            return response;
        } catch (Exception e) {
            updateLogFail(syncLog, null, null, e.getMessage());
            throw e;
        }
    }

    public Map<String, Object> pushMemberCardRecords(List<MemberCardRecord> cardRecords) {
        return pushMemberCardRecords(cardRecords, null);
    }

    public Map<String, Object> pushMemberCardRecords(List<MemberCardRecord> cardRecords, Long configId) {
        log.info("开始调用ERP接口推送会员卡交易, 数量={}", cardRecords.size());
        ErpSyncLog syncLog = createSyncLog(configId, "MEMBER_CARD_RECORDS_PUSH", "PUSH", "AUTO");
        try {
            Map<String, Object> requestData = new HashMap<>();
            requestData.put("cardRecords", cardRecords);

            Map<String, Object> response = executeWithRetry("/member/card/records/push", requestData, HttpMethod.POST, configId, syncLog);
            updateLogSuccess(syncLog, JSON.toJSONString(response));
            return response;
        } catch (Exception e) {
            updateLogFail(syncLog, null, null, e.getMessage());
            throw e;
        }
    }

    public Map<String, Object> pushDailyReport(DailyReport dailyReport) {
        return pushDailyReport(dailyReport, null);
    }

    public Map<String, Object> pushDailyReport(DailyReport dailyReport, Long configId) {
        log.info("开始调用ERP接口推送营业日报, reportNo={}, reportDate={}", dailyReport.getReportNo(), dailyReport.getReportDate());
        ErpSyncLog syncLog = createSyncLog(configId, "DAILY_REPORT_PUSH", "PUSH", "AUTO");
        syncLogService.updateBusinessId(syncLog.getId(), dailyReport.getReportNo());
        try {
            Map<String, Object> requestData = new HashMap<>();
            requestData.put("reportNo", dailyReport.getReportNo());
            requestData.put("reportDate", dailyReport.getReportDate());
            requestData.put("shopId", dailyReport.getShopId());
            requestData.put("shopName", dailyReport.getShopName());
            requestData.put("totalOrders", dailyReport.getTotalOrders());
            requestData.put("totalAmount", dailyReport.getTotalAmount());
            requestData.put("discountAmount", dailyReport.getDiscountAmount());
            requestData.put("refundAmount", dailyReport.getRefundAmount());
            requestData.put("actualAmount", dailyReport.getActualAmount());
            requestData.put("cashAmount", dailyReport.getCashAmount());
            requestData.put("wechatAmount", dailyReport.getWechatAmount());
            requestData.put("alipayAmount", dailyReport.getAlipayAmount());
            requestData.put("memberCardAmount", dailyReport.getMemberCardAmount());
            requestData.put("otherPayAmount", dailyReport.getOtherPayAmount());
            requestData.put("memberDiscountAmount", dailyReport.getMemberDiscountAmount());
            requestData.put("pointsDeductionAmount", dailyReport.getPointsDeductionAmount());
            requestData.put("totalItems", dailyReport.getTotalItems());
            requestData.put("avgOrderAmount", dailyReport.getAvgOrderAmount());
            requestData.put("newMemberCount", dailyReport.getNewMemberCount());
            requestData.put("cashierId", dailyReport.getCashierId());
            requestData.put("cashierName", dailyReport.getCashierName());
            requestData.put("remark", dailyReport.getRemark());

            Map<String, Object> response = executeWithRetry("/report/daily/push", requestData, HttpMethod.POST, configId, syncLog);
            updateLogSuccess(syncLog, JSON.toJSONString(response));
            return response;
        } catch (Exception e) {
            updateLogFail(syncLog, null, null, e.getMessage());
            throw e;
        }
    }

    public List<Map<String, Object>> getStockCheckTasks(Long shopId, String lastSyncTime) {
        return getStockCheckTasks(shopId, lastSyncTime, null);
    }

    public List<Map<String, Object>> getStockCheckTasks(Long shopId, String lastSyncTime, Long configId) {
        log.info("开始调用ERP接口获取盘点任务列表, shopId={}, lastSyncTime={}", shopId, lastSyncTime);
        ErpSyncLog syncLog = createSyncLog(configId, "STOCK_CHECK_TASK_LIST", "PULL", "AUTO");
        try {
            Map<String, Object> requestData = new HashMap<>();
            if (shopId != null) {
                requestData.put("shopId", shopId);
            }
            if (lastSyncTime != null) {
                requestData.put("lastSyncTime", lastSyncTime);
            }
            Map<String, Object> response = executeWithRetry("/stock/check/task/list", requestData, HttpMethod.POST, configId, syncLog);
            Object data = response.get("data");
            if (data == null) {
                updateLogSuccess(syncLog, JSON.toJSONString(response));
                return new ArrayList<>();
            }
            updateLogSuccess(syncLog, JSON.toJSONString(response));
            return JSON.parseArray(JSON.toJSONString(data), Map.class);
        } catch (Exception e) {
            updateLogFail(syncLog, null, null, e.getMessage());
            throw e;
        }
    }

    public Map<String, Object> getStockCheckTaskDetail(String erpTaskId) {
        return getStockCheckTaskDetail(erpTaskId, null);
    }

    public Map<String, Object> getStockCheckTaskDetail(String erpTaskId, Long configId) {
        log.info("开始调用ERP接口获取盘点任务详情, erpTaskId={}", erpTaskId);
        ErpSyncLog syncLog = createSyncLog(configId, "STOCK_CHECK_TASK_DETAIL", "PULL", "AUTO");
        syncLogService.updateBusinessId(syncLog.getId(), erpTaskId);
        try {
            Map<String, Object> requestData = new HashMap<>();
            requestData.put("erpTaskId", erpTaskId);
            Map<String, Object> response = executeWithRetry("/stock/check/task/detail", requestData, HttpMethod.POST, configId, syncLog);
            Object data = response.get("data");
            if (data == null) {
                throw new BusinessException("ERP返回盘点任务详情为空");
            }
            updateLogSuccess(syncLog, JSON.toJSONString(response));
            return JSON.parseObject(JSON.toJSONString(data), Map.class);
        } catch (Exception e) {
            updateLogFail(syncLog, null, null, e.getMessage());
            throw e;
        }
    }

    public List<Map<String, Object>> getStockCheckItems(String erpTaskId) {
        return getStockCheckItems(erpTaskId, null);
    }

    public List<Map<String, Object>> getStockCheckItems(String erpTaskId, Long configId) {
        log.info("开始调用ERP接口获取盘点商品明细, erpTaskId={}", erpTaskId);
        ErpSyncLog syncLog = createSyncLog(configId, "STOCK_CHECK_ITEM_LIST", "PULL", "AUTO");
        try {
            Map<String, Object> requestData = new HashMap<>();
            requestData.put("erpTaskId", erpTaskId);
            Map<String, Object> response = executeWithRetry("/stock/check/item/list", requestData, HttpMethod.POST, configId, syncLog);
            Object data = response.get("data");
            if (data == null) {
                throw new BusinessException("ERP返回盘点商品明细为空");
            }
            updateLogSuccess(syncLog, JSON.toJSONString(response));
            return JSON.parseArray(JSON.toJSONString(data), Map.class);
        } catch (Exception e) {
            updateLogFail(syncLog, null, null, e.getMessage());
            throw e;
        }
    }

    public Map<String, Object> pushStockCheckResult(Map<String, Object> checkResult) {
        return pushStockCheckResult(checkResult, null);
    }

    public Map<String, Object> pushStockCheckResult(Map<String, Object> checkResult, Long configId) {
        log.info("开始调用ERP接口推送盘点结果, erpTaskId={}", checkResult.get("erpTaskId"));
        ErpSyncLog syncLog = createSyncLog(configId, "STOCK_CHECK_RESULT_PUSH", "PUSH", "AUTO");
        if (checkResult.get("erpTaskId") != null) {
            syncLogService.updateBusinessId(syncLog.getId(), checkResult.get("erpTaskId").toString());
        }
        try {
            Map<String, Object> response = executeWithRetry("/stock/check/result/push", checkResult, HttpMethod.POST, configId, syncLog);
            updateLogSuccess(syncLog, JSON.toJSONString(response));
            return response;
        } catch (Exception e) {
            updateLogFail(syncLog, null, null, e.getMessage());
            throw e;
        }
    }

    public Map<String, Object> pushStockCheckDiff(Map<String, Object> diffData) {
        return pushStockCheckDiff(diffData, null);
    }

    public Map<String, Object> pushStockCheckDiff(Map<String, Object> diffData, Long configId) {
        log.info("开始调用ERP接口推送盘点差异, erpTaskId={}", diffData.get("erpTaskId"));
        ErpSyncLog syncLog = createSyncLog(configId, "STOCK_CHECK_DIFF_PUSH", "PUSH", "AUTO");
        if (diffData.get("erpTaskId") != null) {
            syncLogService.updateBusinessId(syncLog.getId(), diffData.get("erpTaskId").toString());
        }
        try {
            Map<String, Object> response = executeWithRetry("/stock/check/diff/push", diffData, HttpMethod.POST, configId, syncLog);
            updateLogSuccess(syncLog, JSON.toJSONString(response));
            return response;
        } catch (Exception e) {
            updateLogFail(syncLog, null, null, e.getMessage());
            throw e;
        }
    }

    public Map<String, Object> pushLossReport(Map<String, Object> lossReport) {
        return pushLossReport(lossReport, null);
    }

    public Map<String, Object> pushLossReport(Map<String, Object> lossReport, Long configId) {
        log.info("开始调用ERP接口推送报损单, lossReportNo={}", lossReport.get("lossReportNo"));
        ErpSyncLog syncLog = createSyncLog(configId, "LOSS_REPORT_PUSH", "PUSH", "AUTO");
        try {
            Map<String, Object> response = executeWithRetry("/stock/loss-report/push", lossReport, HttpMethod.POST, configId, syncLog);
            updateLogSuccess(syncLog, JSON.toJSONString(response));
            return response;
        } catch (Exception e) {
            updateLogFail(syncLog, null, null, e.getMessage());
            throw e;
        }
    }

    public Map<String, Object> pushStockAdjust(Map<String, Object> stockAdjust) {
        return pushStockAdjust(stockAdjust, null);
    }

    public Map<String, Object> pushStockAdjust(Map<String, Object> stockAdjust, Long configId) {
        log.info("开始调用ERP接口推送库存调整单, adjustNo={}", stockAdjust.get("adjustNo"));
        ErpSyncLog syncLog = createSyncLog(configId, "STOCK_ADJUST_PUSH", "PUSH", "AUTO");
        try {
            Map<String, Object> response = executeWithRetry("/stock/adjust/push", stockAdjust, HttpMethod.POST, configId, syncLog);
            updateLogSuccess(syncLog, JSON.toJSONString(response));
            return response;
        } catch (Exception e) {
            updateLogFail(syncLog, null, null, e.getMessage());
            throw e;
        }
    }

    public Map<String, Object> pushPurchaseSuggestion(Map<String, Object> suggestionData) {
        return pushPurchaseSuggestion(suggestionData, null);
    }

    public Map<String, Object> pushPurchaseSuggestion(Map<String, Object> suggestionData, Long configId) {
        log.info("开始调用ERP接口推送采购建议单, suggestionNo={}", suggestionData.get("suggestionNo"));
        if (hasDynamicMapping(configId, "PURCHASE_SUGGESTION_PUSH", "PUSH")) {
            log.info("使用动态映射配置推送采购建议单");
            return executeDynamicPush(configId, "PURCHASE_SUGGESTION_PUSH", suggestionData,
                    String.valueOf(suggestionData.get("suggestionNo")), null);
        }
        ErpSyncLog syncLog = createSyncLog(configId, "PURCHASE_SUGGESTION_PUSH", "PUSH", "AUTO");
        syncLogService.updateBusinessId(syncLog.getId(), String.valueOf(suggestionData.get("suggestionNo")));
        try {
            Map<String, Object> response = executeWithRetry("/purchase/suggestion/push", suggestionData, HttpMethod.POST, configId, syncLog);
            updateLogSuccess(syncLog, JSON.toJSONString(response));
            return response;
        } catch (Exception e) {
            updateLogFail(syncLog, null, null, e.getMessage());
            throw e;
        }
    }

    public Map<String, Object> createPurchaseOrder(Map<String, Object> orderData) {
        return createPurchaseOrder(orderData, null);
    }

    public Map<String, Object> createPurchaseOrder(Map<String, Object> orderData, Long configId) {
        log.info("开始调用ERP接口创建采购订单, suggestionNo={}", orderData.get("suggestionNo"));
        if (hasDynamicMapping(configId, "PURCHASE_ORDER_CREATE", "PUSH")) {
            log.info("使用动态映射配置创建采购订单");
            return executeDynamicPush(configId, "PURCHASE_ORDER_CREATE", orderData,
                    String.valueOf(orderData.get("suggestionNo")), null);
        }
        ErpSyncLog syncLog = createSyncLog(configId, "PURCHASE_ORDER_CREATE", "PUSH", "AUTO");
        syncLogService.updateBusinessId(syncLog.getId(), String.valueOf(orderData.get("suggestionNo")));
        try {
            Map<String, Object> response = executeWithRetry("/purchase/order/create", orderData, HttpMethod.POST, configId, syncLog);
            updateLogSuccess(syncLog, JSON.toJSONString(response));
            return response;
        } catch (Exception e) {
            updateLogFail(syncLog, null, null, e.getMessage());
            throw e;
        }
    }

    public Map<String, Object> executeWithRetry(String path, Map<String, Object> data, HttpMethod method) {
        return executeWithRetry(path, data, method, null, null);
    }

    public Map<String, Object> executeWithRetry(String path, Map<String, Object> data, HttpMethod method, Long configId, ErpSyncLog syncLog) {
        ErpConfig config = configId != null ? dynamicErpConfigManager.getConfigById(configId) : resolveConfig();

        int retryTimes;
        int retryInterval;
        if (config != null) {
            retryTimes = config.getRetryTimes() != null ? config.getRetryTimes() : erpApiProperties.getRetryTimes();
            retryInterval = config.getRetryInterval() != null ? config.getRetryInterval() : erpApiProperties.getRetryInterval();
        } else {
            retryTimes = erpApiProperties.getRetryTimes();
            retryInterval = erpApiProperties.getRetryInterval();
        }

        Exception lastException = null;
        long startTime = System.currentTimeMillis();

        for (int i = 1; i <= retryTimes; i++) {
            try {
                log.info("ERP接口调用第 {} 次尝试, path={}", i, path);
                return executeRequest(path, data, method, config, syncLog);
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

    private Map<String, Object> executeRequest(String path, Map<String, Object> data, HttpMethod method, ErpConfig config, ErpSyncLog syncLog) {
        String baseUrl;
        String authType;
        String appKey;
        String appSecret;
        String token;
        String username;
        String password;
        Integer timeout;

        if (config != null) {
            baseUrl = config.getBaseUrl();
            authType = config.getAuthType();
            appKey = config.getAppKey();
            appSecret = config.getAppSecret();
            token = config.getToken();
            username = config.getUsername();
            password = config.getPassword();
            timeout = config.getTimeout();
        } else {
            baseUrl = erpApiProperties.getBaseUrl();
            authType = "APP_KEY_SIGN";
            appKey = erpApiProperties.getAppKey();
            appSecret = erpApiProperties.getAppSecret();
            token = null;
            username = null;
            password = null;
            timeout = erpApiProperties.getTimeout();
        }

        if (StrUtil.isBlank(baseUrl)) {
            throw new BusinessException("ERP基础地址未配置");
        }

        String url = baseUrl + path;
        long startTime = System.currentTimeMillis();

        Map<String, Object> requestBody = buildRequestBody(data, authType, appKey, appSecret, token);
        HttpHeaders headers = buildHeaders(authType, token, username, password);

        String requestBodyStr = JSON.toJSONString(requestBody);
        HttpEntity<String> entity = new HttpEntity<>(requestBodyStr, headers);

        if (syncLog != null) {
            syncLogService.updateLogStart(syncLog.getId(), url, method.name(), requestBodyStr);
        }

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

            int costTime = (int) (System.currentTimeMillis() - startTime);
            log.debug("ERP接口调用成功, path={}, cost={}ms", path, costTime);

            if (syncLog != null) {
                syncLogService.updateLogSuccess(syncLog.getId(), responseBody, costTime);
            }
            return result;
        } catch (RestClientException e) {
            log.error("ERP接口HTTP请求失败, url={}, error={}", url, e.getMessage());
            int costTime = (int) (System.currentTimeMillis() - startTime);
            if (syncLog != null) {
                syncLogService.updateLogFail(syncLog.getId(), null, "HTTP_ERROR", e.getMessage(), costTime);
            }
            throw new BusinessException("ERP接口HTTP请求失败: " + e.getMessage(), e);
        } catch (BusinessException e) {
            int costTime = (int) (System.currentTimeMillis() - startTime);
            if (syncLog != null) {
                syncLogService.updateLogFail(syncLog.getId(), null, "BIZ_ERROR", e.getMessage(), costTime);
            }
            throw e;
        }
    }

    private Map<String, Object> buildRequestBody(Map<String, Object> data, String authType, String appKey, String appSecret, String token) {
        if ("NONE".equalsIgnoreCase(authType) || "BASIC".equalsIgnoreCase(authType) || "TOKEN".equalsIgnoreCase(authType)) {
            return data != null ? data : new HashMap<>();
        }

        Map<String, Object> requestBody = new HashMap<>();
        long timestamp = System.currentTimeMillis();

        if ("APP_KEY_SIGN".equalsIgnoreCase(authType)) {
            requestBody.put("appKey", appKey);
            requestBody.put("timestamp", timestamp);
            String sign = generateSign(appKey, timestamp, appSecret);
            requestBody.put("sign", sign);
        } else if ("OAUTH2".equalsIgnoreCase(authType)) {
            requestBody.put("accessToken", token);
        }

        requestBody.put("data", data != null ? data : new HashMap<>());
        return requestBody;
    }

    private HttpHeaders buildHeaders(String authType, String token, String username, String password) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Accept", MediaType.APPLICATION_JSON_VALUE);

        if ("BASIC".equalsIgnoreCase(authType) && StrUtil.isNotBlank(username) && StrUtil.isNotBlank(password)) {
            String auth = username + ":" + password;
            byte[] encodedAuth = Base64.encode(auth.getBytes(StandardCharsets.UTF_8));
            headers.set("Authorization", "Basic " + new String(encodedAuth, StandardCharsets.UTF_8));
        } else if ("TOKEN".equalsIgnoreCase(authType) && StrUtil.isNotBlank(token)) {
            headers.set("Authorization", "Bearer " + token);
        } else if ("OAUTH2".equalsIgnoreCase(authType) && StrUtil.isNotBlank(token)) {
            headers.set("Authorization", "Bearer " + token);
        }
        return headers;
    }

    private String generateSign(String appKey, long timestamp, String appSecret) {
        String signStr = appKey + timestamp + appSecret;
        return SecureUtil.md5(signStr);
    }

    private ErpSyncLog createSyncLog(Long configId, String businessType, String direction, String syncType) {
        try {
            ErpConfig config = configId != null ? dynamicErpConfigManager.getConfigById(configId) : resolveConfig();
            Long actualConfigId = config != null ? config.getId() : 1L;
            return syncLogService.createLog(actualConfigId, businessType, direction, syncType);
        } catch (Exception e) {
            log.warn("创建同步日志失败: {}", e.getMessage());
            ErpSyncLog log = new ErpSyncLog();
            log.setId(-1L);
            return log;
        }
    }

    private void updateLogSuccess(ErpSyncLog syncLog, String responseBody) {
        if (syncLog != null && syncLog.getId() != null && syncLog.getId() > 0) {
            syncLogService.updateLogSuccess(syncLog.getId(), responseBody, 0);
        }
    }

    private void updateLogFail(ErpSyncLog syncLog, String errorCode, String errorMessage, String responseBody) {
        if (syncLog != null && syncLog.getId() != null && syncLog.getId() > 0) {
            syncLogService.updateLogFail(syncLog.getId(), responseBody, errorCode, errorMessage, 0);
        }
    }
}
