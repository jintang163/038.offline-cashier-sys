package com.cashier.server.controller.purchase;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.cashier.server.common.Result;
import com.cashier.server.dto.ForecastRequestDTO;
import com.cashier.server.dto.PurchaseSuggestionConfirmDTO;
import com.cashier.server.entity.purchase.PurchaseSuggestion;
import com.cashier.server.entity.purchase.PurchaseSuggestionItem;
import com.cashier.server.service.purchase.PurchaseSuggestionService;
import com.cashier.server.service.purchase.SalesForecastService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/purchase/suggestion")
public class PurchaseSuggestionController {

    @Autowired
    private PurchaseSuggestionService suggestionService;

    @Autowired
    private SalesForecastService salesForecastService;

    @PostMapping("/generate")
    public Result<PurchaseSuggestion> generateSuggestion(@RequestBody ForecastRequestDTO request) {
        PurchaseSuggestion suggestion = suggestionService.generateSuggestion(request);
        return Result.success(suggestion);
    }

    @PostMapping("/auto-forecast")
    public Result<Boolean> triggerAutoForecast(@RequestBody Map<String, String> params) {
        String shopId = params.get("shopId");
        String shopName = params.get("shopName");
        boolean result = suggestionService.triggerAutoForecast(shopId, shopName);
        return Result.success(result);
    }

    @GetMapping("/{id}")
    public Result<Map<String, Object>> getDetail(@PathVariable Long id) {
        Map<String, Object> detail = suggestionService.getSuggestionDetail(id);
        return Result.success(detail);
    }

    @GetMapping("/page")
    public Result<Page<PurchaseSuggestion>> getPage(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) String shopId) {
        Page<PurchaseSuggestion> page = suggestionService.getSuggestionPage(pageNum, pageSize, status, shopId);
        return Result.success(page);
    }

    @GetMapping("/{id}/items")
    public Result<List<PurchaseSuggestionItem>> getItems(@PathVariable Long id) {
        List<PurchaseSuggestionItem> items = suggestionService.getSuggestionItems(id);
        return Result.success(items);
    }

    @PostMapping("/confirm")
    public Result<PurchaseSuggestion> confirmSuggestion(@RequestBody PurchaseSuggestionConfirmDTO confirmDTO) {
        PurchaseSuggestion suggestion = suggestionService.confirmSuggestion(confirmDTO);
        return Result.success(suggestion);
    }

    @PostMapping("/{id}/reject")
    public Result<PurchaseSuggestion> rejectSuggestion(
            @PathVariable Long id,
            @RequestBody Map<String, String> params) {
        String rejectReason = params.get("rejectReason");
        PurchaseSuggestion suggestion = suggestionService.rejectSuggestion(id, rejectReason);
        return Result.success(suggestion);
    }

    @PostMapping("/{id}/push-erp")
    public Result<Boolean> pushToErp(@PathVariable Long id) {
        boolean result = suggestionService.pushSuggestionToErp(id);
        return Result.success(result);
    }

    @PostMapping("/{id}/generate-order")
    public Result<Boolean> generatePurchaseOrder(@PathVariable Long id) {
        boolean result = suggestionService.generatePurchaseOrder(id);
        return Result.success(result);
    }

    @GetMapping("/forecast/historical-sales")
    public Result<Map<String, Object>> getHistoricalSales(
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate) {
        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(14);
        Map<String, Object> result = salesForecastService.calculateHistoricalSales(start, end);
        return Result.success(result);
    }
}
