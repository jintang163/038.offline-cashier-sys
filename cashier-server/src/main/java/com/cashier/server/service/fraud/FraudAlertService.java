package com.cashier.server.service.fraud;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.fraud.FraudAlert;

import java.util.List;
import java.util.Map;

public interface FraudAlertService extends IService<FraudAlert> {

    IPage<FraudAlert> getAlertList(Integer page, Integer size, String alertType, Integer riskLevel, String status);

    FraudAlert createAlert(String alertType, Integer riskLevel, String alertTitle, String alertContent,
                           Map<String, Object> alertDetails, Long storeId, String storeName,
                           Long deviceId, String deviceNo);

    boolean acknowledgeAlert(Long id, Long assigneeId, String assigneeName);

    boolean resolveAlert(Long id, String resolveRemark);

    boolean closeAlert(Long id, String resolveRemark);

    List<FraudAlert> getNewAlerts();

    int getNewAlertCount();
}
