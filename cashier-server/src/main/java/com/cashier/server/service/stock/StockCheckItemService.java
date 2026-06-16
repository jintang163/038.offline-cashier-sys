package com.cashier.server.service.stock;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.stock.StockCheckItem;

import java.util.List;

public interface StockCheckItemService extends IService<StockCheckItem> {

    IPage<StockCheckItem> getItemPage(Integer page, Integer size, Long taskId, Integer checkStatus, String keyword);

    List<StockCheckItem> getItemsByTaskId(Long taskId);

    StockCheckItem getItemByBarcode(Long taskId, String barcode);
}
