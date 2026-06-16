package com.cashier.server.service.stock;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.stock.StockCheckRecord;

import java.util.List;

public interface StockCheckRecordService extends IService<StockCheckRecord> {

    IPage<StockCheckRecord> getRecordPage(Integer page, Integer size, Long taskId, Long itemId, Long productId, String barcode);

    List<StockCheckRecord> getRecordsByTaskId(Long taskId);

    List<StockCheckRecord> getRecordsByItemId(Long itemId);
}
