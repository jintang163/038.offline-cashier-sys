package com.cashier.server.service.erp;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.entity.erp.ErpInterfaceMapping;

import java.util.List;

public interface ErpInterfaceMappingService {

    IPage<ErpInterfaceMapping> page(int pageNum, int pageSize, Long configId, String businessType, String syncDirection);

    List<ErpInterfaceMapping> listByConfigId(Long configId);

    ErpInterfaceMapping getById(Long id);

    ErpInterfaceMapping getByBusinessType(Long configId, String businessType);

    ErpInterfaceMapping getByBusinessType(Long configId, String businessType, String syncDirection);

    boolean save(ErpInterfaceMapping entity);

    boolean update(ErpInterfaceMapping entity);

    boolean removeById(Long id);

    boolean updateStatus(Long id, Integer status);

    List<ErpInterfaceMapping> listByConfigAndDirection(Long configId, String syncDirection);
}
