package com.cashier.server.service.stock;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.entity.stock.StockCheckDiff;
import com.cashier.server.mapper.stock.StockCheckDiffMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
public class StockCheckDiffServiceImpl extends ServiceImpl<StockCheckDiffMapper, StockCheckDiff> implements StockCheckDiffService {

    @Override
    public IPage<StockCheckDiff> getDiffPage(Integer page, Integer size, Long taskId, Integer diffType, Integer handleStatus, String keyword) {
        LambdaQueryWrapper<StockCheckDiff> wrapper = new LambdaQueryWrapper<>();
        if (taskId != null) {
            wrapper.eq(StockCheckDiff::getTaskId, taskId);
        }
        if (diffType != null) {
            wrapper.eq(StockCheckDiff::getDiffType, diffType);
        }
        if (handleStatus != null) {
            wrapper.eq(StockCheckDiff::getHandleStatus, handleStatus);
        }
        if (StrUtil.isNotBlank(keyword)) {
            wrapper.and(w -> w.like(StockCheckDiff::getProductName, keyword)
                    .or().like(StockCheckDiff::getDiffNo, keyword)
                    .or().like(StockCheckDiff::getErpGoodsId, keyword));
        }
        wrapper.orderByDesc(StockCheckDiff::getCreateTime);
        return page(new Page<>(page, size), wrapper);
    }

    @Override
    public List<StockCheckDiff> getDiffsByTaskId(Long taskId) {
        return lambdaQuery()
                .eq(StockCheckDiff::getTaskId, taskId)
                .orderByDesc(StockCheckDiff::getDiffType)
                .list();
    }

    @Override
    public List<StockCheckDiff> getPendingDiffs() {
        return lambdaQuery()
                .eq(StockCheckDiff::getHandleStatus, 0)
                .orderByDesc(StockCheckDiff::getCreateTime)
                .list();
    }
}
