package com.cashier.server.service.fraud;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.entity.fraud.FraudAlert;
import com.cashier.server.mapper.fraud.FraudAlertMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class FraudAlertServiceImpl extends ServiceImpl<FraudAlertMapper, FraudAlert> implements FraudAlertService {

    private static final Logger log = LoggerFactory.getLogger(FraudAlertServiceImpl.class);

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public IPage<FraudAlert> getAlertList(Integer page, Integer size, String alertType, Integer riskLevel, String status) {
        LambdaQueryWrapper<FraudAlert> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(alertType)) {
            wrapper.eq(FraudAlert::getAlertType, alertType);
        }
        if (riskLevel != null) {
            wrapper.eq(FraudAlert::getRiskLevel, riskLevel);
        }
        if (StringUtils.hasText(status)) {
            wrapper.eq(FraudAlert::getStatus, status);
        }
        wrapper.orderByDesc(FraudAlert::getCreateTime);
        return page(new Page<>(page, size), wrapper);
    }

    @Override
    public FraudAlert createAlert(String alertType, Integer riskLevel, String alertTitle, String alertContent,
                                  Map<String, Object> alertDetails, Long storeId, String storeName,
                                  Long deviceId, String deviceNo) {
        try {
            String alertNo = "ALT" + System.currentTimeMillis() +
                    String.format("%04d", (int) (Math.random() * 10000));

            FraudAlert alert = new FraudAlert();
            alert.setAlertNo(alertNo);
            alert.setAlertType(alertType);
            alert.setRiskLevel(riskLevel);
            alert.setAlertTitle(alertTitle);
            alert.setAlertContent(alertContent);
            if (alertDetails != null && !alertDetails.isEmpty()) {
                alert.setAlertDetails(objectMapper.writeValueAsString(alertDetails));
            }
            alert.setStoreId(storeId);
            alert.setStoreName(storeName);
            alert.setDeviceId(deviceId);
            alert.setDeviceNo(deviceNo);
            alert.setStatus("NEW");

            save(alert);
            return alert;
        } catch (JsonProcessingException e) {
            log.error("序列化告警详情失败:", e);
            return null;
        }
    }

    @Override
    public boolean acknowledgeAlert(Long id, Long assigneeId, String assigneeName) {
        FraudAlert alert = getById(id);
        if (alert == null) {
            return false;
        }
        alert.setStatus("ACKNOWLEDGED");
        alert.setAssigneeId(assigneeId);
        alert.setAssigneeName(assigneeName);
        return updateById(alert);
    }

    @Override
    public boolean resolveAlert(Long id, String resolveRemark) {
        FraudAlert alert = getById(id);
        if (alert == null) {
            return false;
        }
        alert.setStatus("RESOLVED");
        alert.setResolveRemark(resolveRemark);
        alert.setResolveTime(LocalDateTime.now());
        return updateById(alert);
    }

    @Override
    public boolean closeAlert(Long id, String resolveRemark) {
        FraudAlert alert = getById(id);
        if (alert == null) {
            return false;
        }
        alert.setStatus("CLOSED");
        alert.setResolveRemark(resolveRemark);
        alert.setResolveTime(LocalDateTime.now());
        return updateById(alert);
    }

    @Override
    public List<FraudAlert> getNewAlerts() {
        return list(new LambdaQueryWrapper<FraudAlert>()
                .eq(FraudAlert::getStatus, "NEW")
                .orderByDesc(FraudAlert::getCreateTime));
    }

    @Override
    public int getNewAlertCount() {
        return count(new LambdaQueryWrapper<FraudAlert>().eq(FraudAlert::getStatus, "NEW")).intValue();
    }
}
