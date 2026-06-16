package com.cashier.server.service.order;

import com.alibaba.excel.EasyExcel;
import com.alibaba.excel.annotation.ExcelProperty;
import com.alibaba.excel.write.style.column.LongestMatchColumnWidthStyleStrategy;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.dto.DailyReportSyncDTO;
import com.cashier.server.entity.order.*;
import com.cashier.server.mapper.order.DailyReportMapper;
import com.cashier.server.service.erp.ErpSyncService;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.*;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.List;
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

            BigDecimal refundAmount = orderItems.stream()
                .filter(item -> item.getQuantity() != null && item.getQuantity() < 0)
                .map(OrderItem::getPayAmount)
                .filter(Objects::nonNull)
                .map(amount -> amount.abs())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

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
            BigDecimal pointsDeductionAmount = BigDecimal.ZERO;

            for (OrderPayment payment : payments) {
                String payType = payment.getPayType();
                BigDecimal amount = payment.getPayAmount() != null ? payment.getPayAmount() : BigDecimal.ZERO;
                if (amount.compareTo(BigDecimal.ZERO) <= 0) continue;

                if ("cash".equals(payType) || "1".equals(payType)) {
                    cashAmount = cashAmount.add(amount);
                } else if ("wechat".equals(payType) || "2".equals(payType)) {
                    wechatAmount = wechatAmount.add(amount);
                } else if ("alipay".equals(payType) || "3".equals(payType)) {
                    alipayAmount = alipayAmount.add(amount);
                } else if ("member_card".equals(payType) || "5".equals(payType)) {
                    memberCardAmount = memberCardAmount.add(amount);
                } else if ("points".equals(payType) || "6".equals(payType) || "point".equals(payType)) {
                    pointsDeductionAmount = pointsDeductionAmount.add(amount);
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
            report.setRefundAmount(refundAmount);
            report.setActualAmount(actualAmount);
            report.setCashAmount(cashAmount);
            report.setWechatAmount(wechatAmount);
            report.setAlipayAmount(alipayAmount);
            report.setMemberCardAmount(memberCardAmount);
            report.setOtherPayAmount(otherPayAmount);
            report.setMemberDiscountAmount(BigDecimal.ZERO);
            report.setPointsDeductionAmount(pointsDeductionAmount);
            report.setTotalItems(totalItems);
            report.setAvgOrderAmount(avgOrderAmount);
            report.setNewMemberCount(0);
        }

        DailyReport existing = getReportByDate(reportDate);
        if (existing != null) {
            report.setId(existing.getId());
            report.setSyncStatus(existing.getSyncStatus());
            report.setSyncAttempts(existing.getSyncAttempts());
            report.setSyncError(existing.getSyncError());
            report.setErpPushStatus(existing.getErpPushStatus());
            report.setErpPushError(existing.getErpPushError());
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
    @Transactional(rollbackFor = Exception.class)
    public boolean batchSaveOrUpdateByDTO(List<DailyReportSyncDTO> dtos) {
        if (dtos == null || dtos.isEmpty()) {
            return true;
        }

        List<DailyReport> toErpPushList = new ArrayList<>();

        for (DailyReportSyncDTO dto : dtos) {
            DailyReport report = new DailyReport();
            BeanUtils.copyProperties(dto, report);

            DailyReport existing = getReportByDate(dto.getReportDate());
            boolean isNew = existing == null;
            Integer oldSyncStatus = existing != null ? existing.getSyncStatus() : null;

            if (existing != null) {
                report.setId(existing.getId());
                if (dto.getSyncStatus() == null) {
                    report.setSyncStatus(existing.getSyncStatus());
                }
                if (dto.getErpPushStatus() == null) {
                    report.setErpPushStatus(existing.getErpPushStatus());
                }
                if (report.getReportNo() == null || report.getReportNo().isEmpty()) {
                    report.setReportNo(existing.getReportNo());
                }
                this.updateById(report);
            } else {
                if (report.getReportNo() == null || report.getReportNo().isEmpty()) {
                    report.setReportNo(generateReportNo(dto.getReportDate()));
                }
                if (dto.getSyncStatus() == null) {
                    report.setSyncStatus(0);
                }
                if (dto.getErpPushStatus() == null) {
                    report.setErpPushStatus(0);
                }
                if (dto.getSyncAttempts() == null) {
                    report.setSyncAttempts(0);
                }
                this.save(report);
            }

            Integer newSyncStatus = report.getSyncStatus();
            if (newSyncStatus != null && newSyncStatus == 1) {
                report.setSyncTime(LocalDateTime.now());
                if (oldSyncStatus == null || oldSyncStatus != 1) {
                    DailyReport updatedReport = getReportByDate(dto.getReportDate());
                    if (updatedReport != null) {
                        updatedReport.setSyncStatus(1);
                        updatedReport.setSyncTime(LocalDateTime.now());
                        this.updateById(updatedReport);
                        toErpPushList.add(updatedReport);
                    }
                }
            }
        }

        if (!toErpPushList.isEmpty() && erpSyncService != null) {
            for (DailyReport report : toErpPushList) {
                try {
                    if (report.getErpPushStatus() == null || report.getErpPushStatus() != 1) {
                        boolean pushSuccess = erpSyncService.pushDailyReportToErp(report);
                        if (pushSuccess) {
                            report.setErpPushStatus(1);
                            report.setErpPushTime(LocalDateTime.now());
                            report.setErpPushError(null);
                        } else {
                            report.setErpPushStatus(2);
                            report.setErpPushError("ERP推送返回失败");
                        }
                        this.updateById(report);
                    }
                } catch (Exception e) {
                    log.error("自动推送ERP失败，日报ID：{}", report.getId(), e);
                    report.setErpPushStatus(2);
                    report.setErpPushError(e.getMessage());
                    this.updateById(report);
                }
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
        BigDecimal totalDiscount = BigDecimal.ZERO;
        BigDecimal totalRefund = BigDecimal.ZERO;
        int totalOrderCount = 0;
        int totalItemsCount = 0;

        for (DailyReport report : reports) {
            dataList.add(convertToExcelVO(report));
            if (report.getTotalAmount() != null) {
                totalTotal = totalTotal.add(report.getTotalAmount());
            }
            if (report.getActualAmount() != null) {
                totalActual = totalActual.add(report.getActualAmount());
            }
            if (report.getDiscountAmount() != null) {
                totalDiscount = totalDiscount.add(report.getDiscountAmount());
            }
            if (report.getRefundAmount() != null) {
                totalRefund = totalRefund.add(report.getRefundAmount());
            }
            if (report.getTotalOrders() != null) {
                totalOrderCount += report.getTotalOrders();
            }
            if (report.getTotalItems() != null) {
                totalItemsCount += report.getTotalItems();
            }
        }

        DailyReportExcelVO summary = new DailyReportExcelVO();
        summary.setReportDate("合计");
        summary.setTotalOrders(totalOrderCount);
        summary.setTotalAmount(totalTotal);
        summary.setDiscountAmount(totalDiscount);
        summary.setRefundAmount(totalRefund);
        summary.setActualAmount(totalActual);
        summary.setTotalItems(totalItemsCount);
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
    public byte[] exportReportToPdf(LocalDate reportDate) {
        DailyReport report = getReportByDate(reportDate);
        if (report == null) {
            report = generateDailyReport(reportDate);
        }
        return generatePdf(Collections.singletonList(report), false);
    }

    @Override
    public byte[] exportReportRangeToPdf(LocalDate startDate, LocalDate endDate) {
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
        return generatePdf(reports, true);
    }

    private byte[] generatePdf(List<DailyReport> reports, boolean includeSummary) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 36, 36);
            PdfWriter.getInstance(document, out);
            document.open();

            BaseFont baseFont = BaseFont.createFont("STSong-Light", "UniGB-UCS2-H", BaseFont.NOT_EMBEDDED);
            Font titleFont = new Font(baseFont, 18, Font.BOLD);
            Font headerFont = new Font(baseFont, 12, Font.BOLD);
            Font contentFont = new Font(baseFont, 10, Font.NORMAL);
            Font boldFont = new Font(baseFont, 10, Font.BOLD);

            Paragraph title = new Paragraph("营业日报表", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");

            for (int rIdx = 0; rIdx < reports.size(); rIdx++) {
                DailyReport report = reports.get(rIdx);

                Paragraph dateTitle = new Paragraph(
                    "报表日期: " + (report.getReportDate() != null ? report.getReportDate().format(dateFmt) : ""),
                    headerFont
                );
                dateTitle.setSpacingBefore(10);
                dateTitle.setSpacingAfter(10);
                document.add(dateTitle);

                Paragraph reportNo = new Paragraph(
                    "报表编号: " + (report.getReportNo() != null ? report.getReportNo() : ""),
                    contentFont
                );
                reportNo.setSpacingAfter(10);
                document.add(reportNo);

                PdfPTable infoTable = new PdfPTable(4);
                infoTable.setWidthPercentage(100);
                infoTable.setSpacingAfter(10);

                addInfoCell(infoTable, "订单总数", String.valueOf(report.getTotalOrders() != null ? report.getTotalOrders() : 0), headerFont, contentFont);
                addInfoCell(infoTable, "商品总数", String.valueOf(report.getTotalItems() != null ? report.getTotalItems() : 0), headerFont, contentFont);
                addInfoCell(infoTable, "客单价", formatAmount(report.getAvgOrderAmount()), headerFont, contentFont);
                addInfoCell(infoTable, "新增会员", String.valueOf(report.getNewMemberCount() != null ? report.getNewMemberCount() : 0), headerFont, contentFont);

                document.add(infoTable);

                PdfPTable amountTable = new PdfPTable(4);
                amountTable.setWidthPercentage(100);
                amountTable.setSpacingAfter(10);

                addAmountCell(amountTable, "营业总额", report.getTotalAmount(), headerFont, boldFont, false);
                addAmountCell(amountTable, "优惠总额", report.getDiscountAmount(), headerFont, contentFont, false);
                addAmountCell(amountTable, "退菜/退款", report.getRefundAmount(), headerFont, contentFont, false);
                addAmountCell(amountTable, "实收金额", report.getActualAmount(), headerFont, boldFont, true);

                addAmountCell(amountTable, "现金", report.getCashAmount(), headerFont, contentFont, false);
                addAmountCell(amountTable, "微信支付", report.getWechatAmount(), headerFont, contentFont, false);
                addAmountCell(amountTable, "支付宝", report.getAlipayAmount(), headerFont, contentFont, false);
                addAmountCell(amountTable, "会员卡", report.getMemberCardAmount(), headerFont, contentFont, false);

                addAmountCell(amountTable, "其他支付", report.getOtherPayAmount(), headerFont, contentFont, false);
                addAmountCell(amountTable, "会员折扣", report.getMemberDiscountAmount(), headerFont, contentFont, false);
                addAmountCell(amountTable, "积分抵扣", report.getPointsDeductionAmount(), headerFont, contentFont, false);
                addInfoCell(infoTable, "", "", headerFont, contentFont);

                document.add(amountTable);

                Paragraph statusLine = new Paragraph(
                    "同步状态: " + getSyncStatusText(report.getSyncStatus()) +
                    "    ERP推送状态: " + getErpPushStatusText(report.getErpPushStatus()),
                    contentFont
                );
                statusLine.setSpacingAfter(5);
                document.add(statusLine);

                if (report.getCashierName() != null && !report.getCashierName().isEmpty()) {
                    Paragraph cashier = new Paragraph("收银员: " + report.getCashierName(), contentFont);
                    document.add(cashier);
                }

                if (report.getRemark() != null && !report.getRemark().isEmpty()) {
                    Paragraph remark = new Paragraph("备注: " + report.getRemark(), contentFont);
                    document.add(remark);
                }

                if (rIdx < reports.size() - 1) {
                    document.add(new Paragraph(" "));
                }
            }

            if (includeSummary && reports.size() > 1) {
                BigDecimal sTotal = BigDecimal.ZERO;
                BigDecimal sActual = BigDecimal.ZERO;
                BigDecimal sDiscount = BigDecimal.ZERO;
                BigDecimal sRefund = BigDecimal.ZERO;
                int sOrders = 0;
                int sItems = 0;

                for (DailyReport r : reports) {
                    if (r.getTotalAmount() != null) sTotal = sTotal.add(r.getTotalAmount());
                    if (r.getActualAmount() != null) sActual = sActual.add(r.getActualAmount());
                    if (r.getDiscountAmount() != null) sDiscount = sDiscount.add(r.getDiscountAmount());
                    if (r.getRefundAmount() != null) sRefund = sRefund.add(r.getRefundAmount());
                    if (r.getTotalOrders() != null) sOrders += r.getTotalOrders();
                    if (r.getTotalItems() != null) sItems += r.getTotalItems();
                }

                document.newPage();
                Paragraph summaryTitle = new Paragraph("合计汇总", titleFont);
                summaryTitle.setAlignment(Element.ALIGN_CENTER);
                summaryTitle.setSpacingAfter(20);
                document.add(summaryTitle);

                PdfPTable summaryTable = new PdfPTable(2);
                summaryTable.setWidthPercentage(60);
                summaryTable.setHorizontalAlignment(Element.ALIGN_CENTER);

                addInfoCell(summaryTable, "报表份数", String.valueOf(reports.size()), headerFont, boldFont);
                addInfoCell(summaryTable, "订单总数", String.valueOf(sOrders), headerFont, boldFont);
                addInfoCell(summaryTable, "商品总数", String.valueOf(sItems), headerFont, boldFont);
                addInfoCell(summaryTable, "营业总额", "¥" + sTotal.setScale(2, RoundingMode.HALF_UP), headerFont, boldFont);
                addInfoCell(summaryTable, "优惠总额", "¥" + sDiscount.setScale(2, RoundingMode.HALF_UP), headerFont, boldFont);
                addInfoCell(summaryTable, "退款总额", "¥" + sRefund.setScale(2, RoundingMode.HALF_UP), headerFont, boldFont);
                addInfoCell(summaryTable, "实收总额", "¥" + sActual.setScale(2, RoundingMode.HALF_UP), headerFont, boldFont);

                document.add(summaryTable);
            }

            Paragraph footer = new Paragraph(
                "生成时间: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),
                contentFont
            );
            footer.setAlignment(Element.ALIGN_RIGHT);
            footer.setSpacingBefore(30);
            document.add(footer);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("生成PDF失败", e);
            throw new RuntimeException("生成PDF失败: " + e.getMessage());
        }
    }

    private void addInfoCell(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setBackgroundColor(new Color(240, 240, 240));
        labelCell.setPadding(5);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, valueFont));
        valueCell.setPadding(5);
        table.addCell(valueCell);
    }

    private void addAmountCell(PdfPTable table, String label, BigDecimal amount, Font labelFont, Font valueFont, boolean highlight) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setBackgroundColor(new Color(240, 240, 240));
        labelCell.setPadding(5);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase("¥" + formatAmount(amount), valueFont));
        if (highlight) {
            valueCell.setBackgroundColor(new Color(255, 245, 245));
        }
        valueCell.setPadding(5);
        table.addCell(valueCell);
    }

    private String formatAmount(BigDecimal amount) {
        if (amount == null) return "0.00";
        return amount.setScale(2, RoundingMode.HALF_UP).toString();
    }

    private String getSyncStatusText(Integer status) {
        if (status == null) return "未知";
        switch (status) {
            case 0: return "未同步";
            case 1: return "已同步";
            case 2: return "同步失败";
            default: return "未知";
        }
    }

    private String getErpPushStatusText(Integer status) {
        if (status == null) return "未知";
        switch (status) {
            case 0: return "未推送";
            case 1: return "已推送";
            case 2: return "推送失败";
            default: return "未知";
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

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean pushSyncedReportsToErpAuto() {
        if (erpSyncService == null) {
            log.warn("ERP同步服务未启用，跳过推送");
            return false;
        }

        List<DailyReport> toPush = this.list(
            new LambdaQueryWrapper<DailyReport>()
                .eq(DailyReport::getSyncStatus, 1)
                .ne(DailyReport::getErpPushStatus, 1)
                .orderByAsc(DailyReport::getReportDate)
                .last("LIMIT 50")
        );

        if (toPush == null || toPush.isEmpty()) {
            return true;
        }

        boolean allSuccess = true;
        for (DailyReport report : toPush) {
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
                log.error("自动推送ERP失败，日报日期：{}", report.getReportDate(), e);
                report.setErpPushStatus(2);
                report.setErpPushError(e.getMessage());
                this.updateById(report);
                allSuccess = false;
            }
        }

        log.info("自动推送已同步日报到ERP完成：共{}条，全部成功：{}", toPush.size(), allSuccess);
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
