package com.cashier.server.service.system.impl;

import cn.hutool.core.util.IdUtil;
import com.alibaba.fastjson.JSON;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.common.BusinessException;
import com.cashier.server.entity.system.CashierDevice;
import com.cashier.server.entity.system.DeviceLogUpload;
import com.cashier.server.entity.system.DeviceSelfCheckLog;
import com.cashier.server.mapper.system.CashierDeviceMapper;
import com.cashier.server.mapper.system.DeviceLogUploadMapper;
import com.cashier.server.mapper.system.DeviceSelfCheckLogMapper;
import com.cashier.server.service.system.DeviceMonitorService;
import com.cashier.server.utils.MinioUtil;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class DeviceMonitorServiceImpl extends ServiceImpl<CashierDeviceMapper, CashierDevice> implements DeviceMonitorService {

    private static final int HEARTBEAT_OFFLINE_SECONDS = 120;

    @Autowired
    private DeviceSelfCheckLogMapper selfCheckLogMapper;

    @Autowired
    private DeviceLogUploadMapper logUploadMapper;

    @Autowired
    private MinioUtil minioUtil;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> deviceHeartbeat(String deviceNo, String ipAddress, Map<String, Object> deviceInfo) {
        if (!StringUtils.hasText(deviceNo)) {
            throw new BusinessException("设备编号不能为空");
        }

        LambdaQueryWrapper<CashierDevice> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CashierDevice::getDeviceNo, deviceNo);
        CashierDevice device = getOne(wrapper);

        LocalDateTime now = LocalDateTime.now();
        if (device == null) {
            device = new CashierDevice();
            device.setDeviceNo(deviceNo);
            device.setDeviceName(deviceNo);
            device.setDeviceType("cashier");
            device.setDeviceStatus(1);
            device.setIsActive(1);
            device.setIsMainDevice(0);
        }

        if (StringUtils.hasText(ipAddress)) {
            device.setIpAddress(ipAddress);
        }
        device.setLastHeartbeat(now);
        device.setDeviceStatus(1);

        if (deviceInfo != null) {
            if (deviceInfo.get("deviceName") != null) {
                device.setDeviceName(deviceInfo.get("deviceName").toString());
            }
            if (deviceInfo.get("deviceType") != null) {
                device.setDeviceType(deviceInfo.get("deviceType").toString());
            }
            if (deviceInfo.get("deviceModel") != null) {
                device.setDeviceModel(deviceInfo.get("deviceModel").toString());
            }
            if (deviceInfo.get("osType") != null) {
                device.setOsType(deviceInfo.get("osType").toString());
            }
            if (deviceInfo.get("osVersion") != null) {
                device.setOsVersion(deviceInfo.get("osVersion").toString());
            }
            if (deviceInfo.get("appVersion") != null) {
                device.setAppVersion(deviceInfo.get("appVersion").toString());
            }
            if (deviceInfo.get("macAddress") != null) {
                device.setMacAddress(deviceInfo.get("macAddress").toString());
            }
            if (deviceInfo.get("location") != null) {
                device.setLocation(deviceInfo.get("location").toString());
            }
        }

        if (device.getId() == null) {
            save(device);
        } else {
            updateById(device);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("deviceId", device.getId());
        result.put("deviceNo", device.getDeviceNo());
        result.put("timestamp", System.currentTimeMillis());
        result.put("serverTime", now.toString());
        result.put("heartbeatInterval", 30);
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DeviceSelfCheckLog saveSelfCheckLog(Map<String, Object> checkData) {
        String deviceNo = checkData.get("deviceNo") != null ? checkData.get("deviceNo").toString() : null;
        if (!StringUtils.hasText(deviceNo)) {
            throw new BusinessException("设备编号不能为空");
        }

        LambdaQueryWrapper<CashierDevice> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CashierDevice::getDeviceNo, deviceNo);
        CashierDevice device = getOne(wrapper);

        DeviceSelfCheckLog log = new DeviceSelfCheckLog();
        log.setCheckNo("SC" + IdUtil.fastSimpleUUID().toUpperCase());

        if (device != null) {
            log.setDeviceId(device.getId());
            log.setDeviceName(device.getDeviceName());
        }
        log.setDeviceNo(deviceNo);

        String checkType = checkData.get("checkType") != null ? checkData.get("checkType").toString() : "FULL";
        log.setCheckType(checkType);

        Integer checkStatus = checkData.get("checkStatus") != null ? Integer.valueOf(checkData.get("checkStatus").toString()) : 2;
        log.setCheckStatus(checkStatus);

        if (checkData.get("networkStatus") != null) {
            log.setNetworkStatus(Integer.valueOf(checkData.get("networkStatus").toString()));
        }
        if (checkData.get("networkLatency") != null) {
            log.setNetworkLatency(Integer.valueOf(checkData.get("networkLatency").toString()));
        }
        if (checkData.get("networkSpeed") != null) {
            log.setNetworkSpeed(checkData.get("networkSpeed").toString());
        }
        if (checkData.get("printerStatus") != null) {
            log.setPrinterStatus(Integer.valueOf(checkData.get("printerStatus").toString()));
        }
        if (checkData.get("printerName") != null) {
            log.setPrinterName(checkData.get("printerName").toString());
        }
        if (checkData.get("printerError") != null) {
            log.setPrinterError(checkData.get("printerError").toString());
        }
        if (checkData.get("storageTotal") != null) {
            log.setStorageTotal(Long.valueOf(checkData.get("storageTotal").toString()));
        }
        if (checkData.get("storageUsed") != null) {
            log.setStorageUsed(Long.valueOf(checkData.get("storageUsed").toString()));
        }
        if (checkData.get("storageFree") != null) {
            log.setStorageFree(Long.valueOf(checkData.get("storageFree").toString()));
        }
        if (checkData.get("storageUsageRate") != null) {
            log.setStorageUsageRate(new BigDecimal(checkData.get("storageUsageRate").toString()));
        }
        if (checkData.get("storageStatus") != null) {
            log.setStorageStatus(Integer.valueOf(checkData.get("storageStatus").toString()));
        }
        if (checkData.get("errorDetails") != null) {
            if (checkData.get("errorDetails") instanceof String) {
                log.setErrorDetails(checkData.get("errorDetails").toString());
            } else {
                log.setErrorDetails(JSON.toJSONString(checkData.get("errorDetails")));
            }
        }

        if (checkStatus == 3) {
            log.setIsAlerted(1);
            log.setAlertTime(LocalDateTime.now());
        } else {
            log.setIsAlerted(0);
        }

        log.setHandleStatus(0);
        selfCheckLogMapper.insert(log);
        return log;
    }

    @Override
    public IPage<DeviceSelfCheckLog> getSelfCheckLogList(Integer page, Integer size, String deviceNo, String checkType, Integer checkStatus, LocalDate startDate, LocalDate endDate) {
        LambdaQueryWrapper<DeviceSelfCheckLog> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(deviceNo)) {
            wrapper.eq(DeviceSelfCheckLog::getDeviceNo, deviceNo);
        }
        if (StringUtils.hasText(checkType)) {
            wrapper.eq(DeviceSelfCheckLog::getCheckType, checkType);
        }
        if (checkStatus != null) {
            wrapper.eq(DeviceSelfCheckLog::getCheckStatus, checkStatus);
        }
        if (startDate != null) {
            wrapper.ge(DeviceSelfCheckLog::getCreateTime, startDate.atStartOfDay());
        }
        if (endDate != null) {
            wrapper.le(DeviceSelfCheckLog::getCreateTime, endDate.atTime(23, 59, 59));
        }
        wrapper.orderByDesc(DeviceSelfCheckLog::getCreateTime);
        return selfCheckLogMapper.selectPage(new Page<>(page, size), wrapper);
    }

    @Override
    public DeviceSelfCheckLog getSelfCheckLogById(Long id) {
        return selfCheckLogMapper.selectById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean handleSelfCheckLog(Long id, Long operatorId, String operatorName, String handleRemark) {
        DeviceSelfCheckLog log = selfCheckLogMapper.selectById(id);
        if (log == null) {
            throw new BusinessException("自检记录不存在");
        }
        log.setOperatorId(operatorId);
        log.setOperatorName(operatorName);
        log.setHandleStatus(2);
        log.setHandleRemark(handleRemark);
        log.setHandleTime(LocalDateTime.now());
        return selfCheckLogMapper.updateById(log) > 0;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DeviceLogUpload createLogUploadRecord(String deviceNo, LocalDate logDate, String logType) {
        if (!StringUtils.hasText(deviceNo)) {
            throw new BusinessException("设备编号不能为空");
        }
        if (logDate == null) {
            logDate = LocalDate.now();
        }
        if (!StringUtils.hasText(logType)) {
            logType = "ALL";
        }

        LambdaQueryWrapper<CashierDevice> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CashierDevice::getDeviceNo, deviceNo);
        CashierDevice device = getOne(wrapper);

        LambdaQueryWrapper<DeviceLogUpload> existWrapper = new LambdaQueryWrapper<>();
        existWrapper.eq(DeviceLogUpload::getDeviceNo, deviceNo)
                .eq(DeviceLogUpload::getLogDate, logDate)
                .eq(DeviceLogUpload::getLogType, logType);
        DeviceLogUpload exist = logUploadMapper.selectOne(existWrapper);
        if (exist != null && exist.getUploadStatus() == 2) {
            return exist;
        }

        DeviceLogUpload upload;
        if (exist != null) {
            upload = exist;
        } else {
            upload = new DeviceLogUpload();
            upload.setUploadNo("LU" + IdUtil.fastSimpleUUID().toUpperCase());
            if (device != null) {
                upload.setDeviceId(device.getId());
                upload.setDeviceName(device.getDeviceName());
            }
            upload.setDeviceNo(deviceNo);
            upload.setLogDate(logDate);
            upload.setLogType(logType);
        }

        String fileName = deviceNo + "_" + logDate + "_" + logType + ".zip";
        upload.setFileName(fileName);
        upload.setUploadStatus(0);
        upload.setUploadAttempts(0);

        if (upload.getId() == null) {
            logUploadMapper.insert(upload);
        } else {
            logUploadMapper.updateById(upload);
        }
        return upload;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DeviceLogUpload uploadLogFile(String uploadNo, MultipartFile file) {
        if (!StringUtils.hasText(uploadNo)) {
            throw new BusinessException("上传编号不能为空");
        }
        if (file == null || file.isEmpty()) {
            throw new BusinessException("上传文件不能为空");
        }

        LambdaQueryWrapper<DeviceLogUpload> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(DeviceLogUpload::getUploadNo, uploadNo);
        DeviceLogUpload upload = logUploadMapper.selectOne(wrapper);
        if (upload == null) {
            throw new BusinessException("上传记录不存在");
        }

        try {
            upload.setUploadStatus(1);
            logUploadMapper.updateById(upload);

            String md5;
            try (InputStream is = file.getInputStream()) {
                md5 = DigestUtils.md5Hex(is);
            }

            String objectName = "cashier-logs/" + upload.getDeviceNo() + "/" + upload.getLogDate() + "/" + upload.getFileName();
            minioUtil.uploadFile(objectName, file);

            upload.setFilePath(objectName);
            upload.setFileSize(file.getSize());
            upload.setFileMd5(md5);
            upload.setUploadStatus(2);
            upload.setUploadAttempts(upload.getUploadAttempts() + 1);
            upload.setUploadTime(LocalDateTime.now());
            upload.setUploadError(null);
            logUploadMapper.updateById(upload);

            return upload;
        } catch (Exception e) {
            log.error("Upload log file failed: {}", uploadNo, e);
            upload.setUploadStatus(3);
            upload.setUploadAttempts(upload.getUploadAttempts() + 1);
            upload.setUploadError(e.getMessage());
            logUploadMapper.updateById(upload);
            throw new BusinessException("文件上传失败: " + e.getMessage());
        }
    }

    @Override
    public IPage<DeviceLogUpload> getLogUploadList(Integer page, Integer size, String deviceNo, LocalDate logDate, String logType, Integer uploadStatus, Integer pullStatus) {
        LambdaQueryWrapper<DeviceLogUpload> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(deviceNo)) {
            wrapper.eq(DeviceLogUpload::getDeviceNo, deviceNo);
        }
        if (logDate != null) {
            wrapper.eq(DeviceLogUpload::getLogDate, logDate);
        }
        if (StringUtils.hasText(logType)) {
            wrapper.eq(DeviceLogUpload::getLogType, logType);
        }
        if (uploadStatus != null) {
            wrapper.eq(DeviceLogUpload::getUploadStatus, uploadStatus);
        }
        if (pullStatus != null) {
            wrapper.eq(DeviceLogUpload::getPullStatus, pullStatus);
        }
        wrapper.orderByDesc(DeviceLogUpload::getCreateTime);
        return logUploadMapper.selectPage(new Page<>(page, size), wrapper);
    }

    @Override
    public DeviceLogUpload getLogUploadById(Long id) {
        return logUploadMapper.selectById(id);
    }

    @Override
    public String getLogDownloadUrl(Long id) {
        DeviceLogUpload upload = logUploadMapper.selectById(id);
        if (upload == null) {
            throw new BusinessException("上传记录不存在");
        }
        if (!StringUtils.hasText(upload.getFilePath())) {
            throw new BusinessException("文件未上传");
        }
        return minioUtil.getPresignedUrl(upload.getFilePath());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DeviceLogUpload requestRemoteLogPull(String deviceNo, LocalDate logDate, String logType, Long operatorId, String operatorName, String pullRemark) {
        if (!StringUtils.hasText(deviceNo)) {
            throw new BusinessException("设备编号不能为空");
        }
        if (logDate == null) {
            logDate = LocalDate.now();
        }
        if (!StringUtils.hasText(logType)) {
            logType = "ALL";
        }

        LambdaQueryWrapper<DeviceLogUpload> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(DeviceLogUpload::getDeviceNo, deviceNo)
                .eq(DeviceLogUpload::getLogDate, logDate)
                .eq(DeviceLogUpload::getLogType, logType);
        DeviceLogUpload upload = logUploadMapper.selectOne(wrapper);

        if (upload == null) {
            upload = createLogUploadRecord(deviceNo, logDate, logType);
        }

        upload.setOperatorId(operatorId);
        upload.setOperatorName(operatorName);
        upload.setPullRequestTime(LocalDateTime.now());
        upload.setPullStatus(1);
        upload.setPullRemark(pullRemark);
        logUploadMapper.updateById(upload);

        return upload;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateLogPullStatus(String uploadNo, Integer pullStatus, String errorMessage) {
        LambdaQueryWrapper<DeviceLogUpload> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(DeviceLogUpload::getUploadNo, uploadNo);
        DeviceLogUpload upload = logUploadMapper.selectOne(wrapper);
        if (upload == null) {
            throw new BusinessException("上传记录不存在");
        }
        upload.setPullStatus(pullStatus);
        if (pullStatus == 4 && StringUtils.hasText(errorMessage)) {
            upload.setPullRemark(errorMessage);
        }
        return logUploadMapper.updateById(upload) > 0;
    }

    @Override
    public List<CashierDevice> getOnlineDeviceList() {
        LocalDateTime cutoffTime = LocalDateTime.now().minusSeconds(HEARTBEAT_OFFLINE_SECONDS);
        LambdaQueryWrapper<CashierDevice> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CashierDevice::getIsActive, 1)
                .ge(CashierDevice::getLastHeartbeat, cutoffTime)
                .orderByDesc(CashierDevice::getLastHeartbeat);
        return list(wrapper);
    }

    @Override
    public IPage<CashierDevice> getDevicePageList(Integer page, Integer size, String deviceType, Integer deviceStatus, String keyword) {
        LambdaQueryWrapper<CashierDevice> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(deviceType)) {
            wrapper.eq(CashierDevice::getDeviceType, deviceType);
        }
        if (deviceStatus != null) {
            if (deviceStatus == 0) {
                LocalDateTime cutoffTime = LocalDateTime.now().minusSeconds(HEARTBEAT_OFFLINE_SECONDS);
                wrapper.lt(CashierDevice::getLastHeartbeat, cutoffTime);
            } else {
                wrapper.eq(CashierDevice::getDeviceStatus, deviceStatus);
            }
        }
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(CashierDevice::getDeviceNo, keyword)
                    .or().like(CashierDevice::getDeviceName, keyword));
        }
        wrapper.orderByDesc(CashierDevice::getLastHeartbeat);
        return page(new Page<>(page, size), wrapper);
    }

    @Override
    public Map<String, Object> getDeviceMonitorOverview() {
        Map<String, Object> result = new HashMap<>();

        LambdaQueryWrapper<CashierDevice> allWrapper = new LambdaQueryWrapper<>();
        allWrapper.eq(CashierDevice::getIsActive, 1);
        Long totalDevices = count(allWrapper);
        result.put("totalDevices", totalDevices);

        List<CashierDevice> onlineDevices = getOnlineDeviceList();
        result.put("onlineDevices", onlineDevices.size());
        result.put("offlineDevices", totalDevices - onlineDevices.size());

        LambdaQueryWrapper<DeviceSelfCheckLog> abnormalWrapper = new LambdaQueryWrapper<>();
        abnormalWrapper.eq(DeviceSelfCheckLog::getCheckStatus, 3)
                .eq(DeviceSelfCheckLog::getHandleStatus, 0);
        Long abnormalCount = selfCheckLogMapper.selectCount(abnormalWrapper);
        result.put("abnormalChecks", abnormalCount);

        LambdaQueryWrapper<DeviceLogUpload> pendingPullWrapper = new LambdaQueryWrapper<>();
        pendingPullWrapper.eq(DeviceLogUpload::getPullStatus, 1);
        Long pendingPullCount = logUploadMapper.selectCount(pendingPullWrapper);
        result.put("pendingLogPulls", pendingPullCount);

        return result;
    }
}
