package com.cashier.server.service.printer;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.entity.printer.PrintTemplate;
import com.cashier.server.mapper.printer.PrintTemplateMapper;
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
public class PrintTemplateServiceImpl extends ServiceImpl<PrintTemplateMapper, PrintTemplate> implements PrintTemplateService {

    private static final Logger log = LoggerFactory.getLogger(PrintTemplateServiceImpl.class);

    @Autowired
    private WebSocketService webSocketService;

    @Override
    public List<PrintTemplate> getAllTemplates() {
        LambdaQueryWrapper<PrintTemplate> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PrintTemplate::getStatus, 1);
        wrapper.orderByAsc(PrintTemplate::getTemplateCode);
        return list(wrapper);
    }

    @Override
    public IPage<PrintTemplate> getTemplatePage(Integer page, Integer size, String keyword, Integer status) {
        LambdaQueryWrapper<PrintTemplate> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(PrintTemplate::getTemplateName, keyword)
                    .or().like(PrintTemplate::getTemplateCode, keyword)
                    .or().like(PrintTemplate::getTemplateType, keyword));
        }
        if (status != null) {
            wrapper.eq(PrintTemplate::getStatus, status);
        }
        wrapper.orderByAsc(PrintTemplate::getTemplateCode);
        return page(new Page<>(page, size), wrapper);
    }

    @Override
    public List<PrintTemplate> getSyncList(String updateTime, Integer status) {
        LambdaQueryWrapper<PrintTemplate> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(updateTime)) {
            try {
                LocalDateTime time = LocalDateTime.parse(updateTime, DateTimeFormatter.ISO_DATE_TIME);
                wrapper.ge(PrintTemplate::getUpdateTime, time);
            } catch (Exception e) {
                log.warn("解析更新时间失败: {}", updateTime);
            }
        }
        if (status != null) {
            wrapper.eq(PrintTemplate::getStatus, status);
        }
        wrapper.orderByAsc(PrintTemplate::getTemplateCode);
        return list(wrapper);
    }

    @Override
    public boolean addTemplate(PrintTemplate template) {
        boolean result = save(template);
        if (result) {
            webSocketService.broadcastPrintTemplateUpdate(template);
        }
        return result;
    }

    @Override
    public boolean updateTemplate(PrintTemplate template) {
        boolean result = updateById(template);
        if (result) {
            webSocketService.broadcastPrintTemplateUpdate(template);
        }
        return result;
    }

    @Override
    public boolean deleteTemplate(Long id) {
        boolean result = removeById(id);
        if (result) {
            webSocketService.broadcastPrintTemplateUpdate(id);
        }
        return result;
    }
}
