package com.cashier.server.controller.system;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.Result;
import com.cashier.server.entity.system.CashierDevice;
import com.cashier.server.entity.system.DeviceLogUpload;
import com.cashier.server.entity.system.DeviceSelfCheckLog;
import com.cashier.server.entity.system.SysUser;
import com.cashier.server.service.system.DeviceMonitorService;
import com.cashier.server.service.system.SysUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/device")
public class DeviceMonitorController {

    @Autowired
    private DeviceMonitorService deviceMonitorService;

    @Autowired
    private SysUserService sysUserService;

    @Autowired
    private HttpServletRequest request;

    private Long getCurrentUserId() {
        try {
            Object userId = request.getAttribute("userId");
            if (userId instanceof Long) {
                return (Long) userId;
            }
            if (userId instanceof Integer) {
                return ((Integer) userId).longValue();
            }
        } catch (Exception e) {
            return null;
        }
        return null;
    }

    private String getCurrentUserName() {
        Long userId = getCurrentUserId();
        if (userId != null) {
            SysUser user = sysUserService.getById(userId);
            if (user != null) {
                return user.getNickname() != null ? user.getNickname() : user.getUsername();
            }
        }
        return "未知用户";
    }

    @PostMapping("/heartbeat")
    public Result<Map<String, Object>> heartbeat(@RequestBody Map<String, Object> params) {
        String deviceNo = params.get("deviceNo") != null ? params.get("deviceNo").toString() : null;
        String ipAddress = params.get("ipAddress") != null ? params.get("ipAddress").toString() : null;
        Map<String, Object> deviceInfo = params.get("deviceInfo") != null ? (Map<String, Object>) params.get("deviceInfo") : null;
        Map<String, Object> result = deviceMonitorService.deviceHeartbeat(deviceNo, ipAddress, deviceInfo);
        return Result.success(result);
    }

    @PostMapping("/self-check")
    public Result<DeviceSelfCheckLog> saveSelfCheckLog(@RequestBody Map<String, Object> checkData) {
        DeviceSelfCheckLog log = deviceMonitorService.saveSelfCheckLog(checkData);
        return Result.success(log);
    }

    @GetMapping("/self-check/list")
    public Result<IPage<DeviceSelfCheckLog>> getSelfCheckLogList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String deviceNo,
            @RequestParam(required = false) String checkType,
            @RequestParam(required = false) Integer checkStatus,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate) {
        IPage<DeviceSelfCheckLog> result = deviceMonitorService.getSelfCheckLogList(page, size, deviceNo, checkType, checkStatus, startDate, endDate);
        return Result.success(result);
    }

    @GetMapping("/self-check/{id}")
    public Result<DeviceSelfCheckLog> getSelfCheckLogById(@PathVariable Long id) {
        DeviceSelfCheckLog log = deviceMonitorService.getSelfCheckLogById(id);
        return Result.success(log);
    }

    @PutMapping("/self-check/{id}/handle")
    public Result<Boolean> handleSelfCheckLog(@PathVariable Long id, @RequestBody Map<String, Object> params) {
        String handleRemark = params.get("handleRemark") != null ? params.get("handleRemark").toString() : null;
        boolean success = deviceMonitorService.handleSelfCheckLog(id, getCurrentUserId(), getCurrentUserName(), handleRemark);
        return Result.success(success);
    }

    @PostMapping("/log/create-upload")
    public Result<DeviceLogUpload> createLogUploadRecord(@RequestBody Map<String, Object> params) {
        String deviceNo = params.get("deviceNo") != null ? params.get("deviceNo").toString() : null;
        LocalDate logDate = params.get("logDate") != null ? LocalDate.parse(params.get("logDate").toString()) : null;
        String logType = params.get("logType") != null ? params.get("logType").toString() : null;
        DeviceLogUpload upload = deviceMonitorService.createLogUploadRecord(deviceNo, logDate, logType);
        return Result.success(upload);
    }

    @PostMapping("/log/upload")
    public Result<DeviceLogUpload> uploadLogFile(
            @RequestParam String uploadNo,
            @RequestParam("file") MultipartFile file) {
        DeviceLogUpload upload = deviceMonitorService.uploadLogFile(uploadNo, file);
        return Result.success(upload);
    }

    @GetMapping("/log/list")
    public Result<IPage<DeviceLogUpload>> getLogUploadList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String deviceNo,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate logDate,
            @RequestParam(required = false) String logType,
            @RequestParam(required = false) Integer uploadStatus,
            @RequestParam(required = false) Integer pullStatus) {
        IPage<DeviceLogUpload> result = deviceMonitorService.getLogUploadList(page, size, deviceNo, logDate, logType, uploadStatus, pullStatus);
        return Result.success(result);
    }

    @GetMapping("/log/{id}")
    public Result<DeviceLogUpload> getLogUploadById(@PathVariable Long id) {
        DeviceLogUpload upload = deviceMonitorService.getLogUploadById(id);
        return Result.success(upload);
    }

    @GetMapping("/log/{id}/download-url")
    public Result<Map<String, Object>> getLogDownloadUrl(@PathVariable Long id) {
        String url = deviceMonitorService.getLogDownloadUrl(id);
        Map<String, Object> result = new HashMap<>();
        result.put("downloadUrl", url);
        return Result.success(result);
    }

    @PostMapping("/log/request-pull")
    public Result<DeviceLogUpload> requestRemoteLogPull(@RequestBody Map<String, Object> params) {
        String deviceNo = params.get("deviceNo") != null ? params.get("deviceNo").toString() : null;
        LocalDate logDate = params.get("logDate") != null ? LocalDate.parse(params.get("logDate").toString()) : null;
        String logType = params.get("logType") != null ? params.get("logType").toString() : null;
        String pullRemark = params.get("pullRemark") != null ? params.get("pullRemark").toString() : null;
        DeviceLogUpload upload = deviceMonitorService.requestRemoteLogPull(deviceNo, logDate, logType, getCurrentUserId(), getCurrentUserName(), pullRemark);
        return Result.success(upload);
    }

    @PutMapping("/log/pull-status")
    public Result<Boolean> updateLogPullStatus(@RequestBody Map<String, Object> params) {
        String uploadNo = params.get("uploadNo") != null ? params.get("uploadNo").toString() : null;
        Integer pullStatus = params.get("pullStatus") != null ? Integer.valueOf(params.get("pullStatus").toString()) : null;
        String errorMessage = params.get("errorMessage") != null ? params.get("errorMessage").toString() : null;
        boolean success = deviceMonitorService.updateLogPullStatus(uploadNo, pullStatus, errorMessage);
        return Result.success(success);
    }

    @GetMapping("/log/pending-pull")
    public Result<List<DeviceLogUpload>> getPendingPullLogs(@RequestParam String deviceNo) {
        IPage<DeviceLogUpload> page = deviceMonitorService.getLogUploadList(1, 100, deviceNo, null, null, null, 1);
        return Result.success(page.getRecords());
    }

    @GetMapping("/list")
    public Result<IPage<CashierDevice>> getDeviceList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String deviceType,
            @RequestParam(required = false) Integer deviceStatus,
            @RequestParam(required = false) String keyword) {
        IPage<CashierDevice> result = deviceMonitorService.getDevicePageList(page, size, deviceType, deviceStatus, keyword);
        return Result.success(result);
    }

    @GetMapping("/online-list")
    public Result<List<CashierDevice>> getOnlineDeviceList() {
        List<CashierDevice> devices = deviceMonitorService.getOnlineDeviceList();
        return Result.success(devices);
    }

    @GetMapping("/monitor/overview")
    public Result<Map<String, Object>> getDeviceMonitorOverview() {
        Map<String, Object> result = deviceMonitorService.getDeviceMonitorOverview();
        return Result.success(result);
    }

    @GetMapping("/log/analysis-summary")
    public Result<Map<String, Object>> getLogAnalysisSummary(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate,
            @RequestParam(required = false) String deviceNo) {
        Map<String, Object> result = deviceMonitorService.getLogAnalysisSummary(startDate, endDate, deviceNo);
        return Result.success(result);
    }

    @GetMapping("/device-list-by-location")
    public Result<List<Map<String, Object>>> getDeviceListByLocation() {
        List<Map<String, Object>> result = deviceMonitorService.getDeviceListByLocation();
        return Result.success(result);
    }

    @GetMapping("/monitor/location-overview")
    public Result<Map<String, Object>> getLocationMonitorOverview() {
        Map<String, Object> result = deviceMonitorService.getLocationMonitorOverview();
        return Result.success(result);
    }

    @GetMapping("/self-check/abnormal-list")
    public Result<IPage<DeviceSelfCheckLog>> getAbnormalSelfCheckLogs(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate,
            @RequestParam(required = false) String deviceNo) {
        IPage<DeviceSelfCheckLog> result = deviceMonitorService.getAbnormalSelfCheckLogs(page, size, startDate, endDate, deviceNo);
        return Result.success(result);
    }
}
