package com.cashier.server.service.purchase.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.entity.purchase.PurchaseSuggestionItem;
import com.cashier.server.mapper.purchase.PurchaseSuggestionItemMapper;
import com.cashier.server.service.purchase.PurchaseSuggestionItemService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PurchaseSuggestionItemServiceImpl extends ServiceImpl<PurchaseSuggestionItemMapper, PurchaseSuggestionItem>
        implements PurchaseSuggestionItemService {

    @Override
    public List<PurchaseSuggestionItem> getBySuggestionId(Long suggestionId) {
        return list(new LambdaQueryWrapper<PurchaseSuggestionItem>()
                .eq(PurchaseSuggestionItem::getSuggestionId, suggestionId)
                .orderByDesc(PurchaseSuggestionItem::getSuggestedQuantity));
    }
}
