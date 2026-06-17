package com.cashier.server.service.purchase;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.dto.ForecastRequestDTO;
import com.cashier.server.dto.PurchaseSuggestionConfirmDTO;
import com.cashier.server.entity.purchase.PurchaseSuggestion;
import com.cashier.server.entity.purchase.PurchaseSuggestionItem;

import java.util.List;
import java.util.Map;

public interface PurchaseSuggestionService extends IService<PurchaseSuggestion> {

    PurchaseSuggestion generateSuggestion(ForecastRequestDTO request);

    Map<String, Object> getSuggestionDetail(Long id);

    Page<PurchaseSuggestion> getSuggestionPage(int pageNum, int pageSize, Integer status, String shopId);

    List<PurchaseSuggestionItem> getSuggestionItems(Long suggestionId);

    PurchaseSuggestion confirmSuggestion(PurchaseSuggestionConfirmDTO confirmDTO);

    PurchaseSuggestion rejectSuggestion(Long id, String rejectReason);

    boolean pushSuggestionToErp(Long id);

    boolean generatePurchaseOrder(Long id);

    boolean triggerAutoForecast(String shopId, String shopName);
}
