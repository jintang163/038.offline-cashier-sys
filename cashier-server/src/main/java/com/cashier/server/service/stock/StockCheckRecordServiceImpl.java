package com.cashier.server.service.stock;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.entity.stock.StockCheckRecord;
import com.cashier.server.mapper.stock.StockCheckRecordMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
public class StockCheckRecordServiceImpl extends ServiceImpl<StockCheckRecordMapper, StockCheckRecord> implements StockCheckRecordService {

    @Override
    public IPage<StockCheckRecord> getRecordPage(Integer page, Integer size, Long taskId, Long itemId, Long productId, String barcode) {
        LambdaQueryWrapper<StockCheckRecord> wrapper = new LambdaQueryWrapper<>();
        if (taskId != null) {
            wrapper.eq(StockCheckRecord::getTaskId, taskId);
        }
        if (itemId != null) {
            wrapper.eq(StockCheckRecord::getItemId, itemId);
        }
        if (productId != null) {
            wrapper.eq(StockCheckRecord::getProductId, productId);
        }
        if (StrUtil.isNotBlank(barcode)) {
            wrapper.eq(StockCheckRecord::getBarcode, barcode);
        }
        wrapper.orderByDesc(StockCheckRecord::getScanTime);
        return page(new Page<>(page, size), wrapper);
    }

    @Override
    public List<StockCheckRecord> getRecordsByTaskId(Long taskId) {
        return lambdaQuery()
                .eq(StockCheckRecord::getTaskId, taskId)
                .orderByDesc(StockCheckRecord::getScanTime)
                .list();
    }

    @Override
    public List<StockCheckRecord> getRecordsByItemId(Long itemId) {
        return lambdaQuery()
                .eq(StockCheckRecord::getItemId, itemId)
                .orderByDesc(StockCheckRecord::getScanTime)
                .list();
    }
}
