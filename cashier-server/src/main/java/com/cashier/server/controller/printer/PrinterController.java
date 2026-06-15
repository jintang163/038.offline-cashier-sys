package com.cashier.server.controller.printer;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.Result;
import com.cashier.server.entity.printer.PrintHistory;
import com.cashier.server.entity.printer.PrintRule;
import com.cashier.server.entity.printer.PrintTemplate;
import com.cashier.server.entity.printer.Printer;
import com.cashier.server.service.printer.PrintHistoryService;
import com.cashier.server.service.printer.PrintRuleService;
import com.cashier.server.service.printer.PrintTemplateService;
import com.cashier.server.service.printer.PrinterService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/printer")
public class PrinterController {

    @Autowired
    private PrinterService printerService;

    @Autowired
    private PrintRuleService printRuleService;

    @Autowired
    private PrintTemplateService printTemplateService;

    @Autowired
    private PrintHistoryService printHistoryService;

    @GetMapping("/list")
    public Result<IPage<Printer>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer status) {
        return Result.success(printerService.getPrinterPage(page, size, keyword, status));
    }

    @GetMapping("/all")
    public Result<List<Printer>> all() {
        return Result.success(printerService.getAllPrinters());
    }

    @GetMapping("/sync-list")
    public Result<List<Printer>> syncList(
            @RequestParam(required = false) String updateTime,
            @RequestParam(required = false) Integer status) {
        return Result.success(printerService.getSyncList(updateTime, status));
    }

    @GetMapping("/{id}")
    public Result<Printer> detail(@PathVariable Long id) {
        return Result.success(printerService.getById(id));
    }

    @PostMapping
    public Result<Boolean> add(@RequestBody Printer printer) {
        return Result.success(printerService.addPrinter(printer));
    }

    @PutMapping
    public Result<Boolean> update(@RequestBody Printer printer) {
        return Result.success(printerService.updatePrinter(printer));
    }

    @DeleteMapping("/{id}")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.success(printerService.deletePrinter(id));
    }

    @PostMapping("/{id}/test")
    public Result<Boolean> test(@PathVariable Long id) {
        return Result.success(printerService.testPrinter(id));
    }

    @GetMapping("/rule/list")
    public Result<IPage<PrintRule>> ruleList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer status) {
        return Result.success(printRuleService.getRulePage(page, size, keyword, status));
    }

    @GetMapping("/rule/all")
    public Result<List<PrintRule>> ruleAll() {
        return Result.success(printRuleService.getAllRules());
    }

    @GetMapping("/rule/sync-list")
    public Result<List<PrintRule>> ruleSyncList(
            @RequestParam(required = false) String updateTime,
            @RequestParam(required = false) Integer status) {
        return Result.success(printRuleService.getSyncList(updateTime, status));
    }

    @GetMapping("/rule/category/{categoryId}")
    public Result<List<PrintRule>> ruleByCategory(@PathVariable Long categoryId) {
        return Result.success(printRuleService.getRulesByCategory(categoryId));
    }

    @PostMapping("/rule")
    public Result<Boolean> addRule(@RequestBody PrintRule rule) {
        return Result.success(printRuleService.addRule(rule));
    }

    @PutMapping("/rule")
    public Result<Boolean> updateRule(@RequestBody PrintRule rule) {
        return Result.success(printRuleService.updateRule(rule));
    }

    @DeleteMapping("/rule/{id}")
    public Result<Boolean> deleteRule(@PathVariable Long id) {
        return Result.success(printRuleService.deleteRule(id));
    }

    @GetMapping("/template/list")
    public Result<IPage<PrintTemplate>> templateList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer status) {
        return Result.success(printTemplateService.getTemplatePage(page, size, keyword, status));
    }

    @GetMapping("/template/all")
    public Result<List<PrintTemplate>> templateAll() {
        return Result.success(printTemplateService.getAllTemplates());
    }

    @GetMapping("/template/sync-list")
    public Result<List<PrintTemplate>> templateSyncList(
            @RequestParam(required = false) String updateTime,
            @RequestParam(required = false) Integer status) {
        return Result.success(printTemplateService.getSyncList(updateTime, status));
    }

    @PostMapping("/template")
    public Result<Boolean> addTemplate(@RequestBody PrintTemplate template) {
        return Result.success(printTemplateService.addTemplate(template));
    }

    @PutMapping("/template")
    public Result<Boolean> updateTemplate(@RequestBody PrintTemplate template) {
        return Result.success(printTemplateService.updateTemplate(template));
    }

    @DeleteMapping("/template/{id}")
    public Result<Boolean> deleteTemplate(@PathVariable Long id) {
        return Result.success(printTemplateService.deleteTemplate(id));
    }

    @PostMapping("/history/batch-sync")
    public Result<Map<String, Object>> historyBatchSync(@RequestBody List<PrintHistory> historyList) {
        Map<String, Object> result = printHistoryService.batchSyncHistory(historyList);
        return Result.success(result);
    }

    @GetMapping("/history/list")
    public Result<IPage<PrintHistory>> historyList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size,
            @RequestParam(required = false) Long printerId,
            @RequestParam(required = false) String orderNo,
            @RequestParam(required = false) Integer printStatus) {
        return Result.success(printHistoryService.getHistoryPage(page, size, printerId, orderNo, printStatus));
    }

    @PostMapping("/resolve-printers")
    public Result<Map<String, Object>> resolvePrinters(@RequestBody Map<String, Object> params) {
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) params.get("items");
        if (items == null || items.isEmpty()) {
            return Result.fail("订单菜品为空");
        }
        Map<String, Object> result = printRuleService.resolvePrintersForOrder(items);
        return Result.success(result);
    }
}
