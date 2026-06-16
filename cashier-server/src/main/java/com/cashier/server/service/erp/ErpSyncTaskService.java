package com.cashier.server.service.erp;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.entity.erp.ErpSyncTask;

import java.util.List;

public interface ErpSyncTaskService {

    IPage<ErpSyncTask> page(int pageNum, int pageSize, Long configId, String businessType, Integer enabled);

    List<ErpSyncTask> listAll();

    List<ErpSyncTask> listEnabled();

    ErpSyncTask getById(Long id);

    boolean save(ErpSyncTask entity);

    boolean update(ErpSyncTask entity);

    boolean removeById(Long id);

    boolean updateStatus(Long id, Integer status);

    boolean updateEnabled(Long id, Integer enabled);

    void executeManually(Long id);

    void refreshTask(Long id);

    void refreshAll();
}
