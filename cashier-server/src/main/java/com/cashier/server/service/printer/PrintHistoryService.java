package com.cashier.server.service.printer;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.printer.PrintHistory;

import java.util.List;
import java.util.Map;

public interface PrintHistoryService extends IService<PrintHistory> {

    IPage<PrintHistory> getHistoryPage(Integer page, Integer size, Long printerId, String orderNo, Integer printStatus);

    Map<String, Object> batchSyncHistory(List<PrintHistory> historyList);
}
