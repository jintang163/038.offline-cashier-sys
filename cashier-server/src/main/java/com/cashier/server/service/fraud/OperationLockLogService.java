package com.cashier.server.service.fraud;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.fraud.OperationLockLog;

import java.util.List;
import java.util.Map;

public interface OperationLockLogService extends IService<OperationLockLog> {

    IPage<OperationLockLog> getLockLogList(Integer page, Integer size, String operationType, Integer riskLevel, Integer verifyStatus, String storeId);

    Map<String, Object> verifyOperationLock(Long lockId, String managerUsername, String managerPassword, String verifyRemark);

    Map<String, Object> syncOperationLockLogs(List<OperationLockLog> lockLogs);

    boolean updateVerifyStatus(Long lockId, Integer verifyStatus, Long verifyUserId, String verifyUserName, String verifyRemark);

    List<OperationLockLog> getPendingVerifyLogs();

    Map<String, Object> getLockStatistics();
}
