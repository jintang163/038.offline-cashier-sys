package com.cashier.server.service.erp;

import com.cashier.server.entity.erp.ErpFieldMapping;

import java.util.List;

public interface ErpFieldMappingService {

    List<ErpFieldMapping> listByInterfaceId(Long interfaceMappingId);

    List<ErpFieldMapping> listByInterfaceAndDirection(Long interfaceMappingId, String direction);

    List<ErpFieldMapping> getByInterfaceMappingId(Long interfaceMappingId, String direction);

    ErpFieldMapping getById(Long id);

    boolean save(ErpFieldMapping entity);

    boolean update(ErpFieldMapping entity);

    boolean removeById(Long id);

    boolean updateStatus(Long id, Integer status);

    boolean batchSaveOrUpdate(Long interfaceMappingId, String direction, List<ErpFieldMapping> mappings);
}
