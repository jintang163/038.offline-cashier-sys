package com.cashier.server.service.printer;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.printer.Printer;

import java.util.List;

public interface PrinterService extends IService<Printer> {

    List<Printer> getAllPrinters();

    IPage<Printer> getPrinterPage(Integer page, Integer size, String keyword, Integer status);

    List<Printer> getSyncList(String updateTime, Integer status);

    boolean addPrinter(Printer printer);

    boolean updatePrinter(Printer printer);

    boolean deletePrinter(Long id);

    boolean testPrinter(Long id);
}
