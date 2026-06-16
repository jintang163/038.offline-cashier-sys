package com.cashier.server.service.stock;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.entity.stock.StockCheckItem;
import com.cashier.server.mapper.stock.StockCheckItemMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
public class StockCheckItemServiceImpl extends ServiceImpl<StockCheckItemMapper, StockCheckItem> implements StockCheckItemService {

    @Override
    public IPage<StockCheckItem> getItemPage(Integer page, Integer size, Long taskId, Integer checkStatus, String keyword) {
        LambdaQueryWrapper<StockCheckItem> wrapper = new LambdaQueryWrapper<>();
        if (taskId != null) {
            wrapper.eq(StockCheckItem::getTaskId, taskId);
        }
        if (checkStatus != null) {
            wrapper.eq(StockCheckItem::getCheckStatus, checkStatus);
        }
        if (StrUtil.isNotBlank(keyword)) {
            wrapper.and(w -> w.like(StockCheckItem::getProductName, keyword)
                    .or().like(StockCheckItem::getBarcode, keyword)
                    .or().like(StockCheckItem::getErpGoodsId, keyword));
        }
        wrapper.orderByAsc(StockCheckItem::getCategoryName).orderByAsc(StockCheckItem::getProductName);
        return page(new Page<>(page, size), wrapper);
    }

    @Override
    public List<StockCheckItem> getItemsByTaskId(Long taskId) {
        return lambdaQuery()
                .eq(StockCheckItem::getTaskId, taskId)
                .orderByAsc(StockCheckItem::getCategoryName)
                .orderByAsc(StockCheckItem::getProductName)
                .list();
    }

    @Override
    public StockCheckItem getItemByBarcode(Long taskId, String barcode) {
        return lambdaQuery()
                .eq(StockCheckItem::getTaskId, taskId)
                .eq(StockCheckItem::getBarcode, barcode)
                .one();
    }
}
