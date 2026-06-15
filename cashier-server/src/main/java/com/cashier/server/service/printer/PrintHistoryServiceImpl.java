package com.cashier.server.service.printer;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.entity.printer.PrintHistory;
import com.cashier.server.mapper.printer.PrintHistoryMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PrintHistoryServiceImpl extends ServiceImpl<PrintHistoryMapper, PrintHistory> implements PrintHistoryService {

    private static final Logger log = LoggerFactory.getLogger(PrintHistoryServiceImpl.class);

    @Override
    public IPage<PrintHistory> getHistoryPage(Integer page, Integer size, Long printerId, String orderNo, Integer printStatus) {
        LambdaQueryWrapper<PrintHistory> wrapper = new LambdaQueryWrapper<>();
        if (printerId != null) {
            wrapper.eq(PrintHistory::getPrinterId, printerId);
        }
        if (StringUtils.hasText(orderNo)) {
            wrapper.like(PrintHistory::getOrderNo, orderNo);
        }
        if (printStatus != null) {
            wrapper.eq(PrintHistory::getPrintStatus, printStatus);
        }
        wrapper.orderByDesc(PrintHistory::getCreateTime);
        return page(new Page<>(page, size), wrapper);
    }

    @Override
    public Map<String, Object> batchSyncHistory(List<PrintHistory> historyList) {
        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> failRecords = new ArrayList<>();
        int successCount = 0;

        for (PrintHistory history : historyList) {
            try {
                if (history.getId() != null) {
                    PrintHistory existing = getById(history.getId());
                    if (existing != null) {
                        updateById(history);
                        successCount++;
                        continue;
                    }
                }
                save(history);
                successCount++;
            } catch (Exception e) {
                log.error("同步打印历史记录失败: queueId={}, error={}", history.getQueueId(), e.getMessage());
                Map<String, Object> failRecord = new HashMap<>();
                failRecord.put("queue_id", history.getQueueId());
                failRecord.put("error", e.getMessage());
                failRecords.add(failRecord);
            }
        }

        result.put("successCount", successCount);
        result.put("failCount", failRecords.size());
        result.put("failRecords", failRecords);
        return result;
    }
}
