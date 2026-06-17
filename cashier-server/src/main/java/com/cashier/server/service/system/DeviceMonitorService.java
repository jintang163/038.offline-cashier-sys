package com.cashier.server.service.system;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.system.CashierDevice;
import com.cashier.server.entity.system.DeviceLogUpload;
import com.cashier.server.entity.system.DeviceSelfCheckLog;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public interface DeviceMonitorService extends IService<CashierDevice> {

    Map<String, Object> deviceHeartbeat(String deviceNo, String ipAddress, Map<String, Object> deviceInfo);

    DeviceSelfCheckLog saveSelfCheckLog(Map<String, Object> checkData);

    IPage<DeviceSelfCheckLog> getSelfCheckLogList(Integer page, Integer size, String deviceNo, String checkType, Integer checkStatus, LocalDate startDate, LocalDate endDate);

    DeviceSelfCheckLog getSelfCheckLogById(Long id);

    boolean handleSelfCheckLog(Long id, Long operatorId, String operatorName, String handleRemark);

    DeviceLogUpload createLogUploadRecord(String deviceNo, LocalDate logDate, String logType);

    DeviceLogUpload uploadLogFile(String uploadNo, MultipartFile file);

    IPage<DeviceLogUpload> getLogUploadList(Integer page, Integer size, String deviceNo, LocalDate logDate, String logType, Integer uploadStatus, Integer pullStatus);

    DeviceLogUpload getLogUploadById(Long id);

    String getLogDownloadUrl(Long id);

    DeviceLogUpload requestRemoteLogPull(String deviceNo, LocalDate logDate, String logType, Long operatorId, String operatorName, String pullRemark);

    boolean updateLogPullStatus(String uploadNo, Integer pullStatus, String errorMessage);

    List<CashierDevice> getOnlineDeviceList();

    IPage<CashierDevice> getDevicePageList(Integer page, Integer size, String deviceType, Integer deviceStatus, String keyword);

    Map<String, Object> getDeviceMonitorOverview();
}
