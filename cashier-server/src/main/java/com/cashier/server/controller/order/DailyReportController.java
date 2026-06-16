package com.cashier.server.controller.order;

import com.cashier.server.common.Result;
import com.cashier.server.entity.order.DailyReport;
import com.cashier.server.service.order.DailyReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/daily-report")
public class DailyReportController {

    @Autowired
    private DailyReportService dailyReportService;

    @PostMapping("/generate")
    public Result<DailyReport> generate(@RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate reportDate) {
        DailyReport report = dailyReportService.generateDailyReport(reportDate);
        return Result.success(report);
    }

    @GetMapping("/date/{reportDate}")
    public Result<DailyReport> getByDate(@PathVariable @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate reportDate) {
        DailyReport report = dailyReportService.getReportByDate(reportDate);
        return Result.success(report);
    }

    @GetMapping("/list")
    public Result<List<DailyReport>> list(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate,
            @RequestParam(required = false) Integer syncStatus,
            @RequestParam(required = false) Integer erpPushStatus) {
        List<DailyReport> list = dailyReportService.getReportList(startDate, endDate, syncStatus, erpPushStatus);
        return Result.success(list);
    }

    @GetMapping("/unsynced")
    public Result<List<DailyReport>> getUnsynced(@RequestParam(defaultValue = "50") int limit) {
        List<DailyReport> list = dailyReportService.getUnsyncedReports(limit);
        return Result.success(list);
    }

    @PostMapping("/batch-save")
    public Result<Boolean> batchSave(@RequestBody List<DailyReport> reports) {
        boolean result = dailyReportService.batchSaveOrUpdate(reports);
        return Result.success(result);
    }

    @PutMapping("/{id}/sync-status")
    public Result<Void> updateSyncStatus(
            @PathVariable Long id,
            @RequestParam Integer status,
            @RequestParam(required = false) String error) {
        dailyReportService.updateSyncStatus(id, status, error);
        return Result.success();
    }

    @GetMapping("/export/excel")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate reportDate) {
        byte[] data = dailyReportService.exportReportToExcel(reportDate);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        String fileName = "daily_report_" + reportDate + ".xlsx";
        headers.setContentDispositionFormData("attachment", fileName);
        return ResponseEntity.ok()
                .headers(headers)
                .body(data);
    }

    @GetMapping("/export/excel/range")
    public ResponseEntity<byte[]> exportExcelRange(
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate) {
        byte[] data = dailyReportService.exportReportRangeToExcel(startDate, endDate);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        String fileName = "daily_report_" + startDate + "_" + endDate + ".xlsx";
        headers.setContentDispositionFormData("attachment", fileName);
        return ResponseEntity.ok()
                .headers(headers)
                .body(data);
    }

    @PostMapping("/{id}/push-erp")
    public Result<Boolean> pushToErp(@PathVariable Long id) {
        boolean result = dailyReportService.pushReportToErp(id);
        return Result.success(result);
    }

    @PostMapping("/push-erp/batch")
    public Result<Map<String, Object>> pushUnsyncedToErp() {
        boolean result = dailyReportService.pushUnsyncedReportsToErp();
        return Result.success(Map.of("success", result));
    }
}
