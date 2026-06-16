package com.cashier.server.service.erp;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.entity.erp.ErpDataMapping;

import java.util.List;
import java.util.Map;

public interface ErpDataMappingService {

    IPage<ErpDataMapping> page(int pageNum, int pageSize, Long configId, String mappingType, String keyword);

    List<ErpDataMapping> listByType(Long configId, String mappingType);

    ErpDataMapping getById(Long id);

    boolean save(ErpDataMapping entity);

    boolean update(ErpDataMapping entity);

    boolean removeById(Long id);

    boolean updateStatus(Long id, Integer status);

    Map<String, String> getLocalToErpMap(Long configId, String mappingType);

    Map<String, String> getErpToLocalMap(Long configId, String mappingType);

    String toErpCode(Long configId, String mappingType, String localCode);

    String toLocalCode(Long configId, String mappingType, String erpCode);

    void refreshCache(Long configId);

    void refreshCache(Long configId, String mappingType);

    boolean batchSave(Long configId, String mappingType, List<ErpDataMapping> mappings);
}
