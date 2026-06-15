package com.cashier.server.service.printer;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.entity.printer.Printer;
import com.cashier.server.mapper.printer.PrinterMapper;
import com.cashier.server.websocket.WebSocketService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class PrinterServiceImpl extends ServiceImpl<PrinterMapper, Printer> implements PrinterService {

    private static final Logger log = LoggerFactory.getLogger(PrinterServiceImpl.class);

    @Autowired
    private WebSocketService webSocketService;

    @Override
    public List<Printer> getAllPrinters() {
        LambdaQueryWrapper<Printer> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Printer::getStatus, 1);
        wrapper.orderByAsc(Printer::getSort);
        return list(wrapper);
    }

    @Override
    public IPage<Printer> getPrinterPage(Integer page, Integer size, String keyword, Integer status) {
        LambdaQueryWrapper<Printer> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(Printer::getPrinterName, keyword)
                    .or().like(Printer::getPrinterCode, keyword)
                    .or().like(Printer::getIpAddress, keyword));
        }
        if (status != null) {
            wrapper.eq(Printer::getStatus, status);
        }
        wrapper.orderByAsc(Printer::getSort);
        return page(new Page<>(page, size), wrapper);
    }

    @Override
    public List<Printer> getSyncList(String updateTime, Integer status) {
        LambdaQueryWrapper<Printer> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(updateTime)) {
            try {
                LocalDateTime time = LocalDateTime.parse(updateTime, DateTimeFormatter.ISO_DATE_TIME);
                wrapper.ge(Printer::getUpdateTime, time);
            } catch (Exception e) {
                log.warn("解析更新时间失败: {}", updateTime);
            }
        }
        if (status != null) {
            wrapper.eq(Printer::getStatus, status);
        }
        wrapper.orderByAsc(Printer::getSort);
        return list(wrapper);
    }

    @Override
    public boolean addPrinter(Printer printer) {
        boolean result = save(printer);
        if (result) {
            webSocketService.broadcastPrinterConfigUpdate(printer);
        }
        return result;
    }

    @Override
    public boolean updatePrinter(Printer printer) {
        boolean result = updateById(printer);
        if (result) {
            webSocketService.broadcastPrinterConfigUpdate(printer);
        }
        return result;
    }

    @Override
    public boolean deletePrinter(Long id) {
        boolean result = removeById(id);
        if (result) {
            webSocketService.broadcastPrinterConfigUpdate(id);
        }
        return result;
    }

    @Override
    public boolean testPrinter(Long id) {
        Printer printer = getById(id);
        if (printer == null || printer.getStatus() != 1) {
            return false;
        }
        log.info("测试打印机: {}", printer.getPrinterName());
        return true;
    }
}
