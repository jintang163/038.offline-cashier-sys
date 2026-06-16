package com.cashier.server.service.erp;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.common.BusinessException;
import com.cashier.server.entity.erp.ErpFieldMapping;
import com.cashier.server.mapper.erp.ErpFieldMappingMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ErpFieldMappingServiceImpl extends ServiceImpl<ErpFieldMappingMapper, ErpFieldMapping> implements ErpFieldMappingService {

    @Autowired
    private FieldMappingEngine fieldMappingEngine;

    @Override
    public List<ErpFieldMapping> listByInterfaceId(Long interfaceMappingId) {
        return this.lambdaQuery()
                .eq(ErpFieldMapping::getInterfaceMappingId, interfaceMappingId)
                .eq(ErpFieldMapping::getStatus, 1)
                .orderByAsc(ErpFieldMapping::getSort)
                .list();
    }

    @Override
    public List<ErpFieldMapping> listByInterfaceAndDirection(Long interfaceMappingId, String direction) {
        return this.lambdaQuery()
                .eq(ErpFieldMapping::getInterfaceMappingId, interfaceMappingId)
                .eq(ErpFieldMapping::getMappingDirection, direction)
                .eq(ErpFieldMapping::getStatus, 1)
                .orderByAsc(ErpFieldMapping::getSort)
                .list();
    }

    @Override
    public ErpFieldMapping getById(Long id) {
        return this.baseMapper.selectById(id);
    }

    @Override
    public boolean save(ErpFieldMapping entity) {
        if (StrUtil.isBlank(entity.getLocalField()) || StrUtil.isBlank(entity.getErpField())) {
            throw new BusinessException("本地字段名和ERP字段名不能为空");
        }
        if (StrUtil.isBlank(entity.getMappingDirection())) {
            throw new BusinessException("映射方向不能为空");
        }
        if (entity.getSort() == null) entity.setSort(0);
        if (entity.getStatus() == null) entity.setStatus(1);
        if (StrUtil.isBlank(entity.getLocalFieldType())) entity.setLocalFieldType("STRING");
        if (StrUtil.isBlank(entity.getErpFieldType())) entity.setErpFieldType("STRING");
        return this.save(entity);
    }

    @Override
    public boolean update(ErpFieldMapping entity) {
        if (entity.getId() == null) {
            throw new BusinessException("ID不能为空");
        }
        return this.updateById(entity);
    }

    @Override
    public boolean removeById(Long id) {
        return this.removeById(id);
    }

    @Override
    public boolean updateStatus(Long id, Integer status) {
        if (status == null || (status != 0 && status != 1)) {
            throw new BusinessException("无效的状态值");
        }
        return this.lambdaUpdate()
                .eq(ErpFieldMapping::getId, id)
                .set(ErpFieldMapping::getStatus, status)
                .update();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean batchSaveOrUpdate(Long interfaceMappingId, String direction, List<ErpFieldMapping> mappings) {
        if (interfaceMappingId == null || StrUtil.isBlank(direction) || mappings == null) {
            throw new BusinessException("参数不完整");
        }
        this.lambdaUpdate()
                .eq(ErpFieldMapping::getInterfaceMappingId, interfaceMappingId)
                .eq(ErpFieldMapping::getMappingDirection, direction)
                .remove();
        int sort = 1;
        for (ErpFieldMapping mapping : mappings) {
            mapping.setId(null);
            mapping.setInterfaceMappingId(interfaceMappingId);
            mapping.setMappingDirection(direction);
            if (mapping.getSort() == null) mapping.setSort(sort++);
            if (mapping.getStatus() == null) mapping.setStatus(1);
            this.save(mapping);
        }
        return true;
    }
}
