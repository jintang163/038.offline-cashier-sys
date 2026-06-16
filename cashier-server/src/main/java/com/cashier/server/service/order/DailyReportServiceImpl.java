package com.cashier.server.service.order;

import com.alibaba.excel.EasyExcel;
import com.alibaba.excel.annotation.ExcelProperty;
import com.alibaba.excel.write.style.column.LongestMatchColumnWidthStyleStrategy;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.entity.order.*;
import com.cashier.server.mapper.order.DailyReportMapper;
import com.cashier.server.service.erp.ErpSyncService;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class DailyReportServiceImpl extends ServiceImpl<DailyReportMapper, DailyReport> implements DailyReportService {

    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderItemService orderItemService;

    @Autowired
    private OrderPaymentService orderPaymentService;

    @Autowired(required = false)
    private ErpSyncService erpSyncService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DailyReport generateDailyReport(LocalDate reportDate) {
        log.info("开始生成营业日报，日期：{}", reportDate);

        LocalDateTime startTime = reportDate.atStartOfDay();
        LocalDateTime endTime = reportDate.atTime(LocalTime.MAX);

        LambdaQueryWrapper<Order> orderWrapper = new LambdaQueryWrapper<>();
        orderWrapper.between(Order::getCreateTime, startTime, endTime);
        orderWrapper.eq(Order::getPayStatus, 1);
        List<Order> orders = orderService.list(orderWrapper);

        DailyReport report = new DailyReport();
        report.setReportDate(reportDate);
        report.setReportNo(generateReportNo(reportDate));
        report.setReportStatus(1);

        if (orders == null || orders.isEmpty()) {
            report.setTotalOrders(0);
            report.setTotalAmount(BigDecimal.ZERO);
            report.setDiscountAmount(BigDecimal.ZERO);
            report.setRefundAmount(BigDecimal.ZERO);
            report.setActualAmount(BigDecimal.ZERO);
            report.setCashAmount(BigDecimal.ZERO);
            report.setWechatAmount(BigDecimal.ZERO);
            report.setAlipayAmount(BigDecimal.ZERO);
            report.setMemberCardAmount(BigDecimal.ZERO);
            report.setOtherPayAmount(BigDecimal.ZERO);
            report.setMemberDiscountAmount(BigDecimal.ZERO);
            report.setPointsDeductionAmount(BigDecimal.ZERO);
            report.setTotalItems(0);
            report.setAvgOrderAmount(BigDecimal.ZERO);
            report.setNewMemberCount(0);
        } else {
            List<Long> orderIds = orders.stream().map(Order::getId).collect(Collectors.toList());

            List<OrderItem> orderItems = orderItemService.list(
                new LambdaQueryWrapper<OrderItem>().in(OrderItem::getOrderId, orderIds)
            );

            List<OrderPayment> payments = orderPaymentService.list(
                new LambdaQueryWrapper<OrderPayment>().in(OrderPayment::getOrderId, orderIds)
                    .eq(OrderPayment::getPayStatus, 1)
            );

            int totalItems = orderItems.stream()
                .mapToInt(OrderItem::getQuantity)
                .sum();

            BigDecimal totalAmount = orders.stream()
                .map(Order::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal discountAmount = orders.stream()
                .map(Order::getDiscountAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal actualAmount = orders.stream()
                .map(Order::getPayAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal cashAmount = BigDecimal.ZERO;
            BigDecimal wechatAmount = BigDecimal.ZERO;
            BigDecimal alipayAmount = BigDecimal.ZERO;
            BigDecimal memberCardAmount = BigDecimal.ZERO;
            BigDecimal otherPayAmount = BigDecimal.ZERO;

            for (OrderPayment payment : payments) {
                String payType = payment.getPayType();
                BigDecimal amount = payment.getPayAmount() != null ? payment.getPayAmount() : BigDecimal.ZERO;

                if ("cash".equals(payType) || "1".equals(payType)) {
                    cashAmount = cashAmount.add(amount);
                } else if ("wechat".equals(payType) || "2".equals(payType)) {
                    wechatAmount = wechatAmount.add(amount);
                } else if ("alipay".equals(payType) || "3".equals(payType)) {
                    alipayAmount = alipayAmount.add(amount);
                } else if ("member_card".equals(payType) || "5".equals(payType)) {
                    memberCardAmount = memberCardAmount.add(amount);
                } else {
                    otherPayAmount = otherPayAmount.add(amount);
                }
            }

            BigDecimal avgOrderAmount = orders.size() > 0
                ? actualAmount.divide(BigDecimal.valueOf(orders.size()), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

            report.setTotalOrders(orders.size());
            report.setTotalAmount(totalAmount);
            report.setDiscountAmount(discountAmount);
            report.setRefundAmount(BigDecimal.ZERO);
            report.setActualAmount(actualAmount);
            report.setCashAmount(cashAmount);
            report.setWechatAmount(wechatAmount);
            report.setAlipayAmount(alipayAmount);
            report.setMemberCardAmount(memberCardAmount);
            report.setOtherPayAmount(otherPayAmount);
            report.setMemberDiscountAmount(BigDecimal.ZERO);
            report.setPointsDeductionAmount(BigDecimal.ZERO);
            report.setTotalItems(totalItems);
            report.setAvgOrderAmount(avgOrderAmount);
            report.setNewMemberCount(0);
        }

        DailyReport existing = getReportByDate(reportDate);
        if (existing != null) {
            report.setId(existing.getId());
            report.setSyncStatus(existing.getSyncStatus());
            report.setErpPushStatus(existing.getErpPushStatus());
            this.updateById(report);
            log.info("营业日报已更新，日期：{}", reportDate);
        } else {
            report.setSyncStatus(0);
            report.setErpPushStatus(0);
            report.setSyncAttempts(0);
            this.save(report);
            log.info("营业日报已生成，日期：{}", reportDate);
        }

        return report;
    }

    @Override
    public DailyReport getReportByDate(LocalDate reportDate) {
        return this.getOne(
            new LambdaQueryWrapper<DailyReport>()
                .eq(DailyReport::getReportDate, reportDate)
                .last("LIMIT 1")
        );
    }

    @Override
    public List<DailyReport> getReportList(LocalDate startDate, LocalDate endDate, Integer syncStatus, Integer erpPushStatus) {
        LambdaQueryWrapper<DailyReport> wrapper = new LambdaQueryWrapper<>();
        if (startDate != null) {
            wrapper.ge(DailyReport::getReportDate, startDate);
        }
        if (endDate != null) {
            wrapper.le(DailyReport::getReportDate, endDate);
        }
        if (syncStatus != null) {
            wrapper.eq(DailyReport::getSyncStatus, syncStatus);
        }
        if (erpPushStatus != null) {
            wrapper.eq(DailyReport::getErpPushStatus, erpPushStatus);
        }
        wrapper.orderByDesc(DailyReport::getReportDate);
        return this.list(wrapper);
    }

    @Override
    public List<DailyReport> getUnsyncedReports(int limit) {
        return this.list(
            new LambdaQueryWrapper<DailyReport>()
                .ne(DailyReport::getSyncStatus, 1)
                .orderByAsc(DailyReport::getReportDate)
                .last("LIMIT " + limit)
        );
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateSyncStatus(Long id, Integer status, String error) {
        DailyReport report = new DailyReport();
        report.setId(id);
        report.setSyncStatus(status);
        if (status == 1) {
            report.setSyncTime(LocalDateTime.now());
        }
        if (error != null) {
            report.setSyncError(error);
            DailyReport existing = this.getById(id);
            if (existing != null) {
                report.setSyncAttempts((existing.getSyncAttempts() != null ? existing.getSyncAttempts() : 0) + 1);
            }
        }
        return this.updateById(report);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean batchSaveOrUpdate(List<DailyReport> reports) {
        if (reports == null || reports.isEmpty()) {
            return true;
        }

        for (DailyReport report : reports) {
            DailyReport existing = getReportByDate(report.getReportDate());
            if (existing != null) {
                report.setId(existing.getId());
                if (report.getSyncStatus() == null) {
                    report.setSyncStatus(existing.getSyncStatus());
                }
                if (report.getErpPushStatus() == null) {
                    report.setErpPushStatus(existing.getErpPushStatus());
                }
                this.updateById(report);
            } else {
                if (report.getSyncStatus() == null) {
                    report.setSyncStatus(0);
                }
                if (report.getErpPushStatus() == null) {
                    report.setErpPushStatus(0);
                }
                if (report.getSyncAttempts() == null) {
                    report.setSyncAttempts(0);
                }
                this.save(report);
            }
        }
        return true;
    }

    @Override
    public byte[] exportReportToExcel(LocalDate reportDate) {
        DailyReport report = getReportByDate(reportDate);
        if (report == null) {
            report = generateDailyReport(reportDate);
        }

        List<DailyReportExcelVO> dataList = new ArrayList<>();
        dataList.add(convertToExcelVO(report));

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            EasyExcel.write(out, DailyReportExcelVO.class)
                .registerWriteHandler(new LongestMatchColumnWidthStyleStrategy())
                .sheet("营业日报")
                .doWrite(dataList);
            return out.toByteArray();
        } catch (Exception e) {
            log.error("导出营业日报Excel失败", e);
            throw new RuntimeException("导出Excel失败: " + e.getMessage());
        }
    }

    @Override
    public byte[] exportReportRangeToExcel(LocalDate startDate, LocalDate endDate) {
        List<DailyReport> reports = this.list(
            new LambdaQueryWrapper<DailyReport>()
                .between(DailyReport::getReportDate, startDate, endDate)
                .orderByAsc(DailyReport::getReportDate)
        );

        if (reports == null || reports.isEmpty()) {
            reports = new ArrayList<>();
            for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
                try {
                    DailyReport report = generateDailyReport(date);
                    reports.add(report);
                } catch (Exception e) {
                    log.warn("生成日报失败，日期：{}", date, e);
                }
            }
        }

        List<DailyReportExcelVO> dataList = new ArrayList<>();
        BigDecimal totalTotal = BigDecimal.ZERO;
        BigDecimal totalActual = BigDecimal.ZERO;
        int totalOrderCount = 0;

        for (DailyReport report : reports) {
            dataList.add(convertToExcelVO(report));
            if (report.getTotalAmount() != null) {
                totalTotal = totalTotal.add(report.getTotalAmount());
            }
            if (report.getActualAmount() != null) {
                totalActual = totalActual.add(report.getActualAmount());
            }
            if (report.getTotalOrders() != null) {
                totalOrderCount += report.getTotalOrders();
            }
        }

        DailyReportExcelVO summary = new DailyReportExcelVO();
        summary.setReportDate("合计");
        summary.setTotalOrders(totalOrderCount);
        summary.setTotalAmount(totalTotal);
        summary.setActualAmount(totalActual);
        dataList.add(summary);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            EasyExcel.write(out, DailyReportExcelVO.class)
                .registerWriteHandler(new LongestMatchColumnWidthStyleStrategy())
                .sheet("营业日报汇总")
                .doWrite(dataList);
            return out.toByteArray();
        } catch (Exception e) {
            log.error("导出营业日报范围Excel失败", e);
            throw new RuntimeException("导出Excel失败: " + e.getMessage());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean pushReportToErp(Long reportId) {
        if (erpSyncService == null) {
            log.warn("ERP同步服务未启用，跳过推送");
            return false;
        }

        DailyReport report = this.getById(reportId);
        if (report == null) {
            return false;
        }

        try {
            boolean success = erpSyncService.pushDailyReportToErp(report);
            if (success) {
                report.setErpPushStatus(1);
                report.setErpPushTime(LocalDateTime.now());
                report.setErpPushError(null);
                this.updateById(report);
                return true;
            } else {
                report.setErpPushStatus(2);
                report.setErpPushError("ERP推送失败");
                this.updateById(report);
                return false;
            }
        } catch (Exception e) {
            log.error("推送日报到ERP失败", e);
            report.setErpPushStatus(2);
            report.setErpPushError(e.getMessage());
            this.updateById(report);
            return false;
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean pushUnsyncedReportsToErp() {
        if (erpSyncService == null) {
            log.warn("ERP同步服务未启用，跳过推送");
            return false;
        }

        List<DailyReport> unsynced = this.list(
            new LambdaQueryWrapper<DailyReport>()
                .ne(DailyReport::getErpPushStatus, 1)
                .orderByAsc(DailyReport::getReportDate)
                .last("LIMIT 30")
        );

        if (unsynced == null || unsynced.isEmpty()) {
            return true;
        }

        boolean allSuccess = true;
        for (DailyReport report : unsynced) {
            try {
                boolean success = erpSyncService.pushDailyReportToErp(report);
                if (success) {
                    report.setErpPushStatus(1);
                    report.setErpPushTime(LocalDateTime.now());
                    report.setErpPushError(null);
                } else {
                    report.setErpPushStatus(2);
                    report.setErpPushError("ERP推送失败");
                    allSuccess = false;
                }
                this.updateById(report);
            } catch (Exception e) {
                log.error("推送日报到ERP失败，日期：{}", report.getReportDate(), e);
                report.setErpPushStatus(2);
                report.setErpPushError(e.getMessage());
                this.updateById(report);
                allSuccess = false;
            }
        }

        return allSuccess;
    }

    private String generateReportNo(LocalDate date) {
        String dateStr = date.toString().replace("-", "");
        String random = String.format("%04d", new Random().nextInt(10000));
        return "RPT" + dateStr + random;
    }

    private DailyReportExcelVO convertToExcelVO(DailyReport report) {
        DailyReportExcelVO vo = new DailyReportExcelVO();
        vo.setReportDate(report.getReportDate() != null ? report.getReportDate().toString() : "");
        vo.setTotalOrders(report.getTotalOrders() != null ? report.getTotalOrders() : 0);
        vo.setTotalAmount(report.getTotalAmount());
        vo.setDiscountAmount(report.getDiscountAmount());
        vo.setRefundAmount(report.getRefundAmount());
        vo.setActualAmount(report.getActualAmount());
        vo.setCashAmount(report.getCashAmount());
        vo.setWechatAmount(report.getWechatAmount());
        vo.setAlipayAmount(report.getAlipayAmount());
        vo.setMemberCardAmount(report.getMemberCardAmount());
        vo.setOtherPayAmount(report.getOtherPayAmount());
        vo.setTotalItems(report.getTotalItems() != null ? report.getTotalItems() : 0);
        vo.setAvgOrderAmount(report.getAvgOrderAmount());
        vo.setRemark(report.getRemark());
        return vo;
    }

    @Data
    public static class DailyReportExcelVO {

        @ExcelProperty("报表日期")
        private String reportDate;

        @ExcelProperty("总订单数")
        private Integer totalOrders;

        @ExcelProperty("营业总额")
        private BigDecimal totalAmount;

        @ExcelProperty("优惠总额")
        private BigDecimal discountAmount;

        @ExcelProperty("退款总额")
        private BigDecimal refundAmount;

        @ExcelProperty("实收金额")
        private BigDecimal actualAmount;

        @ExcelProperty("现金收款")
        private BigDecimal cashAmount;

        @ExcelProperty("微信收款")
        private BigDecimal wechatAmount;

        @ExcelProperty("支付宝收款")
        private BigDecimal alipayAmount;

        @ExcelProperty("会员卡收款")
        private BigDecimal memberCardAmount;

        @ExcelProperty("其他收款")
        private BigDecimal otherPayAmount;

        @ExcelProperty("商品总数")
        private Integer totalItems;

        @ExcelProperty("客单价")
        private BigDecimal avgOrderAmount;

        @ExcelProperty("备注")
        private String remark;
    }
}
