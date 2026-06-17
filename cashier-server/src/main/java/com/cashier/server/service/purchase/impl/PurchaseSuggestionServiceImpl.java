package com.cashier.server.service.purchase.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.common.BusinessException;
import com.cashier.server.dto.ForecastRequestDTO;
import com.cashier.server.dto.PurchaseSuggestionConfirmDTO;
import com.cashier.server.entity.purchase.PurchaseSuggestion;
import com.cashier.server.entity.purchase.PurchaseSuggestionItem;
import com.cashier.server.mapper.purchase.PurchaseSuggestionMapper;
import com.cashier.server.service.erp.ErpApiClient;
import com.cashier.server.service.purchase.PurchaseSuggestionService;
import com.cashier.server.service.purchase.SalesForecastService;
import com.cashier.server.service.purchase.PurchaseSuggestionItemService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class PurchaseSuggestionServiceImpl extends ServiceImpl<PurchaseSuggestionMapper, PurchaseSuggestion>
        implements PurchaseSuggestionService {

    private static final Logger log = LoggerFactory.getLogger(PurchaseSuggestionServiceImpl.class);

    private static final int STATUS_PENDING = 10;
    private static final int STATUS_CONFIRMED = 20;
    private static final int STATUS_PUSHED = 30;
    private static final int STATUS_ORDERED = 40;
    private static final int STATUS_REJECTED = 50;

    private static final int PUSH_STATUS_NONE = 0;
    private static final int PUSH_STATUS_PUSHING = 1;
    private static final int PUSH_STATUS_SUCCESS = 2;
    private static final int PUSH_STATUS_FAILED = 3;

    @Autowired
    private SalesForecastService salesForecastService;

    @Autowired
    private PurchaseSuggestionItemService suggestionItemService;

    @Autowired
    private ErpApiClient erpApiClient;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PurchaseSuggestion generateSuggestion(ForecastRequestDTO request) {
        log.info("开始生成采购建议单, forecastDays={}, safetyStockDays={}",
                request.getForecastDays(), request.getSafetyStockDays());

        List<PurchaseSuggestionItem> suggestionItems = salesForecastService.calculatePurchaseSuggestions(request);
        if (suggestionItems.isEmpty()) {
            throw new BusinessException("无需要补货的商品，无法生成采购建议单");
        }

        String suggestionNo = generateSuggestionNo();
        LocalDate forecastEndDate = request.getEndDate() != null ? request.getEndDate() : LocalDate.now();
        LocalDate forecastStartDate = request.getStartDate() != null ? request.getStartDate() : forecastEndDate.minusDays(14);

        PurchaseSuggestion suggestion = new PurchaseSuggestion();
        suggestion.setSuggestionNo(suggestionNo);
        suggestion.setShopId(request.getShopId());
        suggestion.setShopName(request.getShopName());
        suggestion.setForecastStartDate(forecastStartDate);
        suggestion.setForecastEndDate(forecastEndDate);
        suggestion.setForecastDays(request.getForecastDays());
        suggestion.setStatus(STATUS_PENDING);
        suggestion.setGenerateType(request.getGenerateType());
        suggestion.setPushErpStatus(PUSH_STATUS_NONE);
        suggestion.setRemark(request.getRemark());

        BigDecimal totalSuggestedQty = BigDecimal.ZERO;
        BigDecimal totalSuggestedAmount = BigDecimal.ZERO;
        BigDecimal totalConfirmedQty = BigDecimal.ZERO;
        BigDecimal totalConfirmedAmount = BigDecimal.ZERO;

        for (PurchaseSuggestionItem item : suggestionItems) {
            totalSuggestedQty = totalSuggestedQty.add(item.getSuggestedQuantity());
            totalSuggestedAmount = totalSuggestedAmount.add(item.getSuggestedAmount());
            totalConfirmedQty = totalConfirmedQty.add(item.getConfirmedQuantity());
            totalConfirmedAmount = totalConfirmedAmount.add(item.getConfirmedAmount());
        }

        suggestion.setTotalSuggestedQuantity(totalSuggestedQty);
        suggestion.setTotalSuggestedAmount(totalSuggestedAmount);
        suggestion.setTotalConfirmedQuantity(totalConfirmedQty);
        suggestion.setTotalConfirmedAmount(totalConfirmedAmount);

        save(suggestion);

        for (PurchaseSuggestionItem item : suggestionItems) {
            item.setSuggestionId(suggestion.getId());
            item.setSuggestionNo(suggestionNo);
        }
        suggestionItemService.saveBatch(suggestionItems);

        log.info("采购建议单生成成功, suggestionNo={}, itemCount={}", suggestionNo, suggestionItems.size());
        return suggestion;
    }

    @Override
    public Map<String, Object> getSuggestionDetail(Long id) {
        PurchaseSuggestion suggestion = getById(id);
        if (suggestion == null) {
            throw new BusinessException("采购建议单不存在");
        }

        List<PurchaseSuggestionItem> items = getSuggestionItems(id);

        Map<String, Object> result = new HashMap<>();
        result.put("suggestion", suggestion);
        result.put("items", items);
        return result;
    }

    @Override
    public Page<PurchaseSuggestion> getSuggestionPage(int pageNum, int pageSize, Integer status, String shopId) {
        Page<PurchaseSuggestion> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<PurchaseSuggestion> wrapper = new LambdaQueryWrapper<>();

        if (status != null) {
            wrapper.eq(PurchaseSuggestion::getStatus, status);
        }
        if (shopId != null && !shopId.trim().isEmpty()) {
            wrapper.eq(PurchaseSuggestion::getShopId, shopId);
        }
        wrapper.orderByDesc(PurchaseSuggestion::getCreateTime);

        return page(page, wrapper);
    }

    @Override
    public List<PurchaseSuggestionItem> getSuggestionItems(Long suggestionId) {
        return suggestionItemService.list(new LambdaQueryWrapper<PurchaseSuggestionItem>()
                .eq(PurchaseSuggestionItem::getSuggestionId, suggestionId)
                .orderByDesc(PurchaseSuggestionItem::getSuggestedQuantity));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PurchaseSuggestion confirmSuggestion(PurchaseSuggestionConfirmDTO confirmDTO) {
        PurchaseSuggestion suggestion = getById(confirmDTO.getSuggestionId());
        if (suggestion == null) {
            throw new BusinessException("采购建议单不存在");
        }
        if (suggestion.getStatus() != STATUS_PENDING) {
            throw new BusinessException("只有待确认状态的建议单才能确认");
        }

        List<PurchaseSuggestionConfirmDTO.ConfirmItem> confirmItems = confirmDTO.getItems();
        BigDecimal totalConfirmedQty = BigDecimal.ZERO;
        BigDecimal totalConfirmedAmount = BigDecimal.ZERO;

        for (PurchaseSuggestionConfirmDTO.ConfirmItem confirmItem : confirmItems) {
            PurchaseSuggestionItem item = suggestionItemService.getById(confirmItem.getItemId());
            if (item != null) {
                item.setConfirmedQuantity(confirmItem.getConfirmedQuantity());
                item.setConfirmedAmount(confirmItem.getConfirmedAmount());
                item.setRemark(confirmItem.getRemark());
                suggestionItemService.updateById(item);

                totalConfirmedQty = totalConfirmedQty.add(confirmItem.getConfirmedQuantity() != null ? confirmItem.getConfirmedQuantity() : BigDecimal.ZERO);
                totalConfirmedAmount = totalConfirmedAmount.add(confirmItem.getConfirmedAmount() != null ? confirmItem.getConfirmedAmount() : BigDecimal.ZERO);
            }
        }

        suggestion.setStatus(STATUS_CONFIRMED);
        suggestion.setConfirmRemark(confirmDTO.getConfirmRemark());
        suggestion.setConfirmDate(LocalDate.now());
        suggestion.setTotalConfirmedQuantity(totalConfirmedQty);
        suggestion.setTotalConfirmedAmount(totalConfirmedAmount);
        updateById(suggestion);

        log.info("采购建议单确认成功, suggestionNo={}", suggestion.getSuggestionNo());
        return suggestion;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PurchaseSuggestion rejectSuggestion(Long id, String rejectReason) {
        PurchaseSuggestion suggestion = getById(id);
        if (suggestion == null) {
            throw new BusinessException("采购建议单不存在");
        }
        if (suggestion.getStatus() != STATUS_PENDING) {
            throw new BusinessException("只有待确认状态的建议单才能驳回");
        }

        suggestion.setStatus(STATUS_REJECTED);
        suggestion.setRemark(rejectReason);
        updateById(suggestion);

        log.info("采购建议单已驳回, suggestionNo={}, reason={}", suggestion.getSuggestionNo(), rejectReason);
        return suggestion;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean pushSuggestionToErp(Long id) {
        PurchaseSuggestion suggestion = getById(id);
        if (suggestion == null) {
            throw new BusinessException("采购建议单不存在");
        }
        if (suggestion.getStatus() != STATUS_CONFIRMED) {
            throw new BusinessException("只有已确认状态的建议单才能推送ERP");
        }

        suggestion.setPushErpStatus(PUSH_STATUS_PUSHING);
        updateById(suggestion);

        try {
            Map<String, Object> pushData = buildSuggestionPushData(suggestion);
            Map<String, Object> response = erpApiClient.pushPurchaseSuggestion(pushData);

            Object data = response.get("data");
            String erpId = null;
            if (data instanceof Map) {
                erpId = String.valueOf(((Map<?, ?>) data).get("erpSuggestionId"));
            }

            suggestion.setStatus(STATUS_PUSHED);
            suggestion.setPushErpStatus(PUSH_STATUS_SUCCESS);
            suggestion.setErpPurchaseSuggestionId(erpId);
            updateById(suggestion);

            log.info("采购建议单推送ERP成功, suggestionNo={}, erpId={}", suggestion.getSuggestionNo(), erpId);
            return true;
        } catch (Exception e) {
            suggestion.setPushErpStatus(PUSH_STATUS_FAILED);
            suggestion.setPushErpError(e.getMessage());
            updateById(suggestion);
            log.error("采购建议单推送ERP失败, suggestionNo={}, error={}", suggestion.getSuggestionNo(), e.getMessage());
            throw new BusinessException("推送ERP失败: " + e.getMessage());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean generatePurchaseOrder(Long id) {
        PurchaseSuggestion suggestion = getById(id);
        if (suggestion == null) {
            throw new BusinessException("采购建议单不存在");
        }
        if (suggestion.getStatus() != STATUS_PUSHED) {
            throw new BusinessException("只有已推送ERP状态的建议单才能生成采购订单");
        }

        try {
            Map<String, Object> orderData = buildPurchaseOrderData(suggestion);
            Map<String, Object> response = erpApiClient.createPurchaseOrder(orderData);

            Object data = response.get("data");
            String erpOrderId = null;
            if (data instanceof Map) {
                erpOrderId = String.valueOf(((Map<?, ?>) data).get("erpPurchaseOrderId"));
            }

            suggestion.setStatus(STATUS_ORDERED);
            suggestion.setErpPurchaseOrderId(erpOrderId);
            updateById(suggestion);

            log.info("采购订单生成成功, suggestionNo={}, erpOrderId={}", suggestion.getSuggestionNo(), erpOrderId);
            return true;
        } catch (Exception e) {
            log.error("生成采购订单失败, suggestionNo={}, error={}", suggestion.getSuggestionNo(), e.getMessage());
            throw new BusinessException("生成采购订单失败: " + e.getMessage());
        }
    }

    @Override
    public boolean triggerAutoForecast(String shopId, String shopName) {
        log.info("离线恢复自动触发采购预测, shopId={}, shopName={}", shopId, shopName);
        try {
            ForecastRequestDTO request = new ForecastRequestDTO();
            request.setShopId(shopId);
            request.setShopName(shopName);
            request.setGenerateType(1);
            request.setRemark("网络恢复自动生成");
            generateSuggestion(request);
            return true;
        } catch (Exception e) {
            log.warn("自动生成采购建议单失败: {}", e.getMessage());
            return false;
        }
    }

    private String generateSuggestionNo() {
        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String random = String.format("%04d", new Random().nextInt(10000));
        return "PS" + dateStr + random;
    }

    private Map<String, Object> buildSuggestionPushData(PurchaseSuggestion suggestion) {
        List<PurchaseSuggestionItem> items = getSuggestionItems(suggestion.getId());
        List<Map<String, Object>> itemList = new ArrayList<>();

        for (PurchaseSuggestionItem item : items) {
            Map<String, Object> itemMap = new HashMap<>();
            itemMap.put("productId", item.getProductId());
            itemMap.put("erpGoodsId", item.getErpGoodsId());
            itemMap.put("productName", item.getProductName());
            itemMap.put("categoryName", item.getCategoryName());
            itemMap.put("unit", item.getUnit());
            itemMap.put("historicalSalesQuantity", item.getHistoricalSalesQuantity());
            itemMap.put("dailyAverageSales", item.getDailyAverageSales());
            itemMap.put("forecastSalesQuantity", item.getForecastSalesQuantity());
            itemMap.put("currentStock", item.getCurrentStock());
            itemMap.put("availableStock", item.getAvailableStock());
            itemMap.put("safetyStock", item.getSafetyStock());
            itemMap.put("purchaseQuantity", item.getConfirmedQuantity());
            itemMap.put("purchasePrice", item.getPurchasePrice());
            itemMap.put("purchaseAmount", item.getConfirmedAmount());
            itemMap.put("remark", item.getRemark());
            itemList.add(itemMap);
        }

        Map<String, Object> data = new HashMap<>();
        data.put("suggestionNo", suggestion.getSuggestionNo());
        data.put("shopId", suggestion.getShopId());
        data.put("shopName", suggestion.getShopName());
        data.put("forecastStartDate", suggestion.getForecastStartDate());
        data.put("forecastEndDate", suggestion.getForecastEndDate());
        data.put("forecastDays", suggestion.getForecastDays());
        data.put("totalQuantity", suggestion.getTotalConfirmedQuantity());
        data.put("totalAmount", suggestion.getTotalConfirmedAmount());
        data.put("confirmRemark", suggestion.getConfirmRemark());
        data.put("confirmDate", suggestion.getConfirmDate());
        data.put("confirmUserName", suggestion.getConfirmUserName());
        data.put("remark", suggestion.getRemark());
        data.put("items", itemList);
        return data;
    }

    private Map<String, Object> buildPurchaseOrderData(PurchaseSuggestion suggestion) {
        Map<String, Object> orderData = buildSuggestionPushData(suggestion);
        orderData.put("erpSuggestionId", suggestion.getErpPurchaseSuggestionId());
        return orderData;
    }
}
