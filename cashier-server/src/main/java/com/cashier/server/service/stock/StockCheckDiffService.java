package com.cashier.server.service.stock;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.stock.StockCheckDiff;

import java.util.List;

public interface StockCheckDiffService extends IService<StockCheckDiff> {

    IPage<StockCheckDiff> getDiffPage(Integer page, Integer size, Long taskId, Integer diffType, Integer handleStatus, String keyword);

    List<StockCheckDiff> getDiffsByTaskId(Long taskId);

    List<StockCheckDiff> getPendingDiffs();
}
