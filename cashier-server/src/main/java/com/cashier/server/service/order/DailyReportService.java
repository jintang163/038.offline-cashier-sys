package com.cashier.server.service.order;

import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.order.DailyReport;

import java.time.LocalDate;
import java.util.List;

public interface DailyReportService extends IService<DailyReport> {

    DailyReport generateDailyReport(LocalDate reportDate);

    DailyReport getReportByDate(LocalDate reportDate);

    List<DailyReport> getReportList(LocalDate startDate, LocalDate endDate, Integer syncStatus, Integer erpPushStatus);

    List<DailyReport> getUnsyncedReports(int limit);

    boolean updateSyncStatus(Long id, Integer status, String error);

    boolean batchSaveOrUpdate(List<DailyReport> reports);

    byte[] exportReportToExcel(LocalDate reportDate);

    byte[] exportReportRangeToExcel(LocalDate startDate, LocalDate endDate);

    boolean pushReportToErp(Long reportId);

    boolean pushUnsyncedReportsToErp();
}
