package com.cashier.server.service.printer;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.entity.printer.PrintRule;
import com.cashier.server.entity.printer.Printer;
import com.cashier.server.mapper.printer.PrintRuleMapper;
import com.cashier.server.websocket.WebSocketService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class PrintRuleServiceImpl extends ServiceImpl<PrintRuleMapper, PrintRule> implements PrintRuleService {

    private static final Logger log = LoggerFactory.getLogger(PrintRuleServiceImpl.class);

    @Autowired
    private WebSocketService webSocketService;

    @Autowired
    private PrinterService printerService;

    @Override
    public List<PrintRule> getAllRules() {
        LambdaQueryWrapper<PrintRule> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PrintRule::getStatus, 1);
        wrapper.orderByAsc(PrintRule::getSort);
        return list(wrapper);
    }

    @Override
    public IPage<PrintRule> getRulePage(Integer page, Integer size, String keyword, Integer status) {
        LambdaQueryWrapper<PrintRule> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(PrintRule::getRuleName, keyword)
                    .or().like(PrintRule::getRuleCode, keyword)
                    .or().like(PrintRule::getCategoryName, keyword));
        }
        if (status != null) {
            wrapper.eq(PrintRule::getStatus, status);
        }
        wrapper.orderByAsc(PrintRule::getSort);
        return page(new Page<>(page, size), wrapper);
    }

    @Override
    public List<PrintRule> getSyncList(String updateTime, Integer status) {
        LambdaQueryWrapper<PrintRule> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(updateTime)) {
            try {
                LocalDateTime time = LocalDateTime.parse(updateTime, DateTimeFormatter.ISO_DATE_TIME);
                wrapper.ge(PrintRule::getUpdateTime, time);
            } catch (Exception e) {
                log.warn("解析更新时间失败: {}", updateTime);
            }
        }
        if (status != null) {
            wrapper.eq(PrintRule::getStatus, status);
        }
        wrapper.orderByAsc(PrintRule::getSort);
        return list(wrapper);
    }

    @Override
    public List<PrintRule> getRulesByCategory(Long categoryId) {
        LambdaQueryWrapper<PrintRule> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PrintRule::getCategoryId, categoryId);
        wrapper.eq(PrintRule::getStatus, 1);
        wrapper.orderByAsc(PrintRule::getPriority);
        return list(wrapper);
    }

    @Override
    public boolean addRule(PrintRule rule) {
        boolean result = save(rule);
        if (result) {
            webSocketService.broadcastPrintRuleUpdate(rule);
        }
        return result;
    }

    @Override
    public boolean updateRule(PrintRule rule) {
        boolean result = updateById(rule);
        if (result) {
            webSocketService.broadcastPrintRuleUpdate(rule);
        }
        return result;
    }

    @Override
    public boolean deleteRule(Long id) {
        boolean result = removeById(id);
        if (result) {
            webSocketService.broadcastPrintRuleUpdate(id);
        }
        return result;
    }

    @Override
    public Map<String, Object> resolvePrintersForOrder(List<Map<String, Object>> items) {
        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> printTasks = new ArrayList<>();

        Map<Long, List<Map<String, Object>>> categoryItemMap = new LinkedHashMap<>();
        for (Map<String, Object> item : items) {
            Long categoryId = item.get("category_id") != null ? Long.valueOf(item.get("category_id").toString()) : 0L;
            categoryItemMap.computeIfAbsent(categoryId, k -> new ArrayList<>()).add(item);
        }

        List<PrintRule> allRules = getAllRules();
        Map<Long, List<PrintRule>> ruleByCategory = new HashMap<>();
        for (PrintRule rule : allRules) {
            ruleByCategory.computeIfAbsent(rule.getCategoryId(), k -> new ArrayList<>()).add(rule);
        }

        Printer defaultPrinter = null;
        List<Printer> allPrinters = printerService.getAllPrinters();
        for (Printer p : allPrinters) {
            if (p.getIsDefault() != null && p.getIsDefault() == 1) {
                defaultPrinter = p;
                break;
            }
        }

        for (Map.Entry<Long, List<Map<String, Object>>> entry : categoryItemMap.entrySet()) {
            Long categoryId = entry.getKey();
            List<Map<String, Object>> categoryItems = entry.getValue();

            String categoryName = "";
            if (!categoryItems.isEmpty() && categoryItems.get(0).get("category_name") != null) {
                categoryName = categoryItems.get(0).get("category_name").toString();
            }

            List<PrintRule> rules = ruleByCategory.getOrDefault(categoryId, Collections.emptyList());

            if (rules.isEmpty()) {
                if (defaultPrinter != null) {
                    Map<String, Object> task = new HashMap<>();
                    task.put("printer_id", defaultPrinter.getId());
                    task.put("printer_code", defaultPrinter.getPrinterCode());
                    task.put("printer_name", defaultPrinter.getPrinterName());
                    task.put("connection_type", defaultPrinter.getConnectionType());
                    task.put("ip_address", defaultPrinter.getIpAddress());
                    task.put("port", defaultPrinter.getPort());
                    task.put("usb_path", defaultPrinter.getUsbPath());
                    task.put("bluetooth_address", defaultPrinter.getBluetoothAddress());
                    task.put("category_id", categoryId);
                    task.put("category_name", categoryName);
                    task.put("items", categoryItems);
                    task.put("copies", 1);
                    printTasks.add(task);
                }
                continue;
            }

            rules.sort(Comparator.comparingInt(PrintRule::getPriority).reversed());

            for (PrintRule rule : rules) {
                Printer printer = printerService.getById(rule.getPrinterId());
                if (printer == null || printer.getStatus() != 1) {
                    continue;
                }

                Map<String, Object> task = new HashMap<>();
                task.put("printer_id", printer.getId());
                task.put("printer_code", printer.getPrinterCode());
                task.put("printer_name", printer.getPrinterName());
                task.put("connection_type", printer.getConnectionType());
                task.put("ip_address", printer.getIpAddress());
                task.put("port", printer.getPort());
                task.put("usb_path", printer.getUsbPath());
                task.put("bluetooth_address", printer.getBluetoothAddress());
                task.put("category_id", categoryId);
                task.put("category_name", categoryName);
                task.put("items", categoryItems);
                task.put("copies", rule.getCopies() != null ? rule.getCopies() : 1);
                printTasks.add(task);
            }
        }

        result.put("printTasks", printTasks);
        result.put("totalCategories", categoryItemMap.size());
        result.put("totalTasks", printTasks.size());
        return result;
    }
}
