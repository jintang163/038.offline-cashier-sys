package com.cashier.server.service.purchase;

import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.purchase.PurchaseSuggestionItem;

import java.util.List;

public interface PurchaseSuggestionItemService extends IService<PurchaseSuggestionItem> {

    List<PurchaseSuggestionItem> getBySuggestionId(Long suggestionId);
}
