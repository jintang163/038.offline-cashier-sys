package com.cashier.server.service.system;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.dto.DisasterRecoveryDataDTO;
import com.cashier.server.entity.system.CashierDevice;
import com.cashier.server.entity.system.DisasterRecoveryToken;

import java.util.List;
import java.util.Map;

public interface DisasterRecoveryService extends IService<DisasterRecoveryToken> {

    Map<String, Object> createDisasterToken(Long operatorId, String operatorName, Integer dataHours, String syncScope);

    Map<String, Object> verifyDisasterToken(String token, String deviceNo);

    Map<String, Object> useDisasterToken(String token, String deviceNo, String deviceInfo);

    DisasterRecoveryDataDTO getDisasterRecoveryData(String token, Integer dataHours);

    boolean heartbeat(String deviceNo, String ipAddress);

    CashierDevice registerDevice(String deviceNo, String deviceName, String deviceType, String deviceInfo);

    IPage<CashierDevice> getDeviceList(Integer page, Integer size, String deviceType, Integer deviceStatus, String keyword);

    CashierDevice getMainDevice();

    List<CashierDevice> getOnlineDevices();

    boolean updateDeviceStatus(String deviceNo, Integer status);

    IPage<DisasterRecoveryToken> getTokenList(Integer page, Integer size, Integer tokenStatus, String keyword);

    boolean revokeToken(Long tokenId);
}
