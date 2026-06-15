package com.cashier.server.service.printer;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.printer.PrintTemplate;

import java.util.List;

public interface PrintTemplateService extends IService<PrintTemplate> {

    List<PrintTemplate> getAllTemplates();

    IPage<PrintTemplate> getTemplatePage(Integer page, Integer size, String keyword, Integer status);

    List<PrintTemplate> getSyncList(String updateTime, Integer status);

    boolean addTemplate(PrintTemplate template);

    boolean updateTemplate(PrintTemplate template);

    boolean deleteTemplate(Long id);
}
