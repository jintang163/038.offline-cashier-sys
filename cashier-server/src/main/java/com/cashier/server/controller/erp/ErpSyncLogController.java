package com.cashier.server.controller.erp;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.Result;
import com.cashier.server.dto.erp.ErpSyncLogQueryDTO;
import com.cashier.server.dto.erp.ErpSyncStatisticsDTO;
import com.cashier.server.entity.erp.ErpSyncLog;
import com.cashier.server.service.erp.DynamicErpSyncService;
import com.cashier.server.service.erp.ErpSyncLogService;
import com.alibaba.excel.EasyExcel;
import com.alibaba.excel.annotation.ExcelProperty;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.cashier.server.mapper.erp.ErpSyncLogMapper;
import lombok.Data;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/erp/sync-log")
public class ErpSyncLogController {

    @Autowired
    private ErpSyncLogService syncLogService;

    @Autowired
    private DynamicErpSyncService dynamicErpSyncService;

    @Autowired
    private ErpSyncLogMapper syncLogMapper;

    @GetMapping("/page")
    public Result<IPage<ErpSyncLog>> page(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) Long configId,
            @RequestParam(required = false) String businessType,
            @RequestParam(required = false) String syncDirection,
            @RequestParam(required = false) Integer syncStatus,
            @RequestParam(required = false) String businessId,
            @RequestParam(required = false) String batchNo,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime endTime) {
        ErpSyncLogQueryDTO queryDTO = new ErpSyncLogQueryDTO();
        queryDTO.setPageNum(pageNum);
        queryDTO.setPageSize(pageSize);
        queryDTO.setConfigId(configId);
        queryDTO.setBusinessType(businessType);
        queryDTO.setSyncDirection(syncDirection);
        queryDTO.setSyncStatus(syncStatus);
        queryDTO.setBusinessId(businessId);
        queryDTO.setBatchNo(batchNo);
        queryDTO.setStartTime(startTime);
        queryDTO.setEndTime(endTime);
        return Result.success(syncLogService.queryPage(queryDTO));
    }

    @GetMapping("/list")
    public Result<IPage<ErpSyncLog>> list(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) Long configId,
            @RequestParam(required = false) String businessType,
            @RequestParam(required = false) String syncDirection,
            @RequestParam(required = false) Integer syncStatus,
            @RequestParam(required = false) String businessId,
            @RequestParam(required = false) String batchNo,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime endTime) {
        return page(pageNum, pageSize, configId, businessType, syncDirection, syncStatus, businessId, batchNo, startTime, endTime);
    }

    @GetMapping("/{id}")
    public Result<ErpSyncLog> getById(@PathVariable Long id) {
        return Result.success(syncLogService.getById(id));
    }

    @GetMapping("/statistics")
    public Result<ErpSyncStatisticsDTO> statistics(@RequestParam(required = false) Long configId) {
        return Result.success(syncLogService.getStatistics(configId));
    }

    @PostMapping("/retry/{id}")
    public Result<Object> retry(@PathVariable Long id) {
        try {
            Object result = dynamicErpSyncService.retryByLogId(id);
            return Result.success(result);
        } catch (Exception e) {
            return Result.fail("重试失败: " + e.getMessage());
        }
    }

    @PostMapping("/batch-retry")
    public Result<Integer> batchRetry(@RequestBody Object body) {
        List<Long> ids;
        if (body instanceof List) {
            @SuppressWarnings("unchecked")
            List<Long> list = (List<Long>) body;
            ids = list;
        } else if (body instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> map = (Map<String, Object>) body;
            Object idsObj = map.get("ids");
            if (idsObj instanceof List) {
                @SuppressWarnings("unchecked")
                List<Long> list = (List<Long>) idsObj;
                ids = list;
            } else {
                return Result.fail("ids参数格式错误");
            }
        } else {
            return Result.fail("请求参数格式错误");
        }
        if (ids == null || ids.isEmpty()) {
            return Result.fail("请选择需要重试的日志");
        }
        int successCount = dynamicErpSyncService.batchRetry(ids);
        return Result.success(successCount);
    }

    @GetMapping("/export")
    public void export(
            @RequestParam(required = false) Long configId,
            @RequestParam(required = false) String businessType,
            @RequestParam(required = false) String syncDirection,
            @RequestParam(required = false) Integer syncStatus,
            @RequestParam(required = false) String businessId,
            @RequestParam(required = false) String batchNo,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime endTime,
            HttpServletResponse response) throws IOException {
        LambdaQueryWrapper<ErpSyncLog> wrapper = new LambdaQueryWrapper<>();
        if (configId != null) {
            wrapper.eq(ErpSyncLog::getConfigId, configId);
        }
        if (businessType != null && !businessType.isEmpty()) {
            wrapper.eq(ErpSyncLog::getBusinessType, businessType);
        }
        if (syncDirection != null && !syncDirection.isEmpty()) {
            wrapper.eq(ErpSyncLog::getSyncDirection, syncDirection);
        }
        if (syncStatus != null) {
            wrapper.eq(ErpSyncLog::getSyncStatus, syncStatus);
        }
        if (businessId != null && !businessId.isEmpty()) {
            wrapper.eq(ErpSyncLog::getBusinessId, businessId);
        }
        if (batchNo != null && !batchNo.isEmpty()) {
            wrapper.eq(ErpSyncLog::getBatchNo, batchNo);
        }
        if (startTime != null) {
            wrapper.ge(ErpSyncLog::getCreateTime, startTime);
        }
        if (endTime != null) {
            wrapper.le(ErpSyncLog::getCreateTime, endTime);
        }
        wrapper.orderByDesc(ErpSyncLog::getCreateTime);

        List<ErpSyncLog> logs = syncLogMapper.selectList(wrapper);
        List<ErpSyncLogExcelVO> excelList = new ArrayList<>();
        for (ErpSyncLog log : logs) {
            ErpSyncLogExcelVO vo = new ErpSyncLogExcelVO();
            BeanUtils.copyProperties(log, vo);
            if (log.getSyncStatus() != null) {
                switch (log.getSyncStatus()) {
                    case 0: vo.setSyncStatusText("待处理"); break;
                    case 1: vo.setSyncStatusText("处理中"); break;
                    case 2: vo.setSyncStatusText("成功"); break;
                    case 3: vo.setSyncStatusText("失败"); break;
                    default: vo.setSyncStatusText("未知");
                }
            }
            if (log.getSyncDirection() != null) {
                vo.setSyncDirectionText("REQUEST".equals(log.getSyncDirection()) ? "请求" : "响应");
            }
            if (log.getSyncTime() != null) {
                vo.setSyncTimeText(log.getSyncTime().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
            }
            excelList.add(vo);
        }

        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setCharacterEncoding("utf-8");
        String fileName = URLEncoder.encode("ERP同步日志", StandardCharsets.UTF_8).replaceAll("\\+", "%20");
        response.setHeader("Content-disposition", "attachment;filename*=utf-8''" + fileName + ".xlsx");

        EasyExcel.write(response.getOutputStream(), ErpSyncLogExcelVO.class)
                .sheet("同步日志")
                .doWrite(excelList);
    }

    @Data
    public static class ErpSyncLogExcelVO {
        @ExcelProperty("批次号")
        private String batchNo;

        @ExcelProperty("业务类型")
        private String businessType;

        @ExcelProperty("业务ID")
        private String businessId;

        @ExcelProperty("同步方向")
        private String syncDirectionText;

        @ExcelProperty("同步状态")
        private String syncStatusText;

        @ExcelProperty("请求URL")
        private String requestUrl;

        @ExcelProperty("请求方法")
        private String requestMethod;

        @ExcelProperty("同步时间")
        private String syncTimeText;

        @ExcelProperty("耗时(ms)")
        private Integer costTime;

        @ExcelProperty("重试次数")
        private Integer retryCount;

        @ExcelProperty("错误码")
        private String errorCode;

        @ExcelProperty("错误信息")
        private String errorMessage;

        @ExcelProperty("请求体")
        private String requestBody;

        @ExcelProperty("响应体")
        private String responseBody;
    }
}
