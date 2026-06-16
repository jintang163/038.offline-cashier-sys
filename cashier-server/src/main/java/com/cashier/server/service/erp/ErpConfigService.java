package com.cashier.server.service.erp;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.entity.erp.ErpConfig;

import java.util.List;

public interface ErpConfigService {

    IPage<ErpConfig> page(int pageNum, int pageSize, String keyword, Integer status);

    List<ErpConfig> listAll();

    ErpConfig getById(Long id);

    ErpConfig getDefault();

    boolean save(ErpConfig config);

    boolean update(ErpConfig config);

    boolean removeById(Long id);

    boolean setDefault(Long id);

    boolean updateStatus(Long id, Integer status);

    void refreshCache();

    void refreshCache(Long id);
}
