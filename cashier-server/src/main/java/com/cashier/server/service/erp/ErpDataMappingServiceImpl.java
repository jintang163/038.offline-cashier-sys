package com.cashier.server.service.erp;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.common.BusinessException;
import com.cashier.server.entity.erp.ErpDataMapping;
import com.cashier.server.mapper.erp.ErpDataMappingMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class ErpDataMappingServiceImpl extends ServiceImpl<ErpDataMappingMapper, ErpDataMapping> implements ErpDataMappingService {

    @Autowired
    private DataMappingEngine dataMappingEngine;

    @Override
    public IPage<ErpDataMapping> page(int pageNum, int pageSize, Long configId, String mappingType, String keyword) {
        Page<ErpDataMapping> page = new Page<>(pageNum, pageSize);
        com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ErpDataMapping> wrapper =
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<>();
        if (configId != null) {
            wrapper.eq(ErpDataMapping::getConfigId, configId);
        }
        if (StrUtil.isNotBlank(mappingType)) {
            wrapper.eq(ErpDataMapping::getMappingType, mappingType);
        }
        if (StrUtil.isNotBlank(keyword)) {
            wrapper.like(ErpDataMapping::getMappingCode, keyword)
                    .or().like(ErpDataMapping::getMappingName, keyword)
                    .or().like(ErpDataMapping::getErpCode, keyword)
                    .or().like(ErpDataMapping::getErpName, keyword);
        }
        wrapper.orderByAsc(ErpDataMapping::getMappingType).orderByAsc(ErpDataMapping::getSort);
        return this.page(page, wrapper);
    }

    @Override
    public List<ErpDataMapping> listByType(Long configId, String mappingType) {
        return this.lambdaQuery()
                .eq(ErpDataMapping::getConfigId, configId)
                .eq(ErpDataMapping::getMappingType, mappingType)
                .eq(ErpDataMapping::getStatus, 1)
                .orderByAsc(ErpDataMapping::getSort)
                .list();
    }

    @Override
    public ErpDataMapping getById(Long id) {
        return this.baseMapper.selectById(id);
    }

    @Override
    public boolean save(ErpDataMapping entity) {
        if (entity.getConfigId() == null || StrUtil.isBlank(entity.getMappingType())
                || StrUtil.isBlank(entity.getMappingCode()) || StrUtil.isBlank(entity.getErpCode())) {
            throw new BusinessException("参数不完整");
        }
        ErpDataMapping exist = this.lambdaQuery()
                .eq(ErpDataMapping::getConfigId, entity.getConfigId())
                .eq(ErpDataMapping::getMappingType, entity.getMappingType())
                .eq(ErpDataMapping::getMappingCode, entity.getMappingCode())
                .one();
        if (exist != null) {
            throw new BusinessException("该映射值已存在");
        }
        if (entity.getSort() == null) entity.setSort(0);
        if (entity.getStatus() == null) entity.setStatus(1);
        boolean result = this.save(entity);
        if (result) {
            dataMappingEngine.refreshCache(entity.getConfigId(), entity.getMappingType());
        }
        return result;
    }

    @Override
    public boolean update(ErpDataMapping entity) {
        if (entity.getId() == null) {
            throw new BusinessException("ID不能为空");
        }
        boolean result = this.updateById(entity);
        if (result) {
            ErpDataMapping db = this.getById(entity.getId());
            if (db != null) {
                dataMappingEngine.refreshCache(db.getConfigId(), db.getMappingType());
            }
        }
        return result;
    }

    @Override
    public boolean removeById(Long id) {
        ErpDataMapping entity = this.getById(id);
        if (entity == null) {
            return false;
        }
        boolean result = this.removeById(id);
        if (result) {
            dataMappingEngine.refreshCache(entity.getConfigId(), entity.getMappingType());
        }
        return result;
    }

    @Override
    public boolean updateStatus(Long id, Integer status) {
        if (status == null || (status != 0 && status != 1)) {
            throw new BusinessException("无效的状态值");
        }
        ErpDataMapping entity = this.getById(id);
        if (entity == null) {
            return false;
        }
        boolean result = this.lambdaUpdate()
                .eq(ErpDataMapping::getId, id)
                .set(ErpDataMapping::getStatus, status)
                .update();
        if (result) {
            dataMappingEngine.refreshCache(entity.getConfigId(), entity.getMappingType());
        }
        return result;
    }

    @Override
    public Map<String, String> getLocalToErpMap(Long configId, String mappingType) {
        return dataMappingEngine.getLocalToErpMapping(configId, mappingType);
    }

    @Override
    public Map<String, String> getErpToLocalMap(Long configId, String mappingType) {
        return dataMappingEngine.getErpToLocalMapping(configId, mappingType);
    }

    @Override
    public String toErpCode(Long configId, String mappingType, String localCode) {
        return dataMappingEngine.toErpCode(configId, mappingType, localCode);
    }

    @Override
    public String toLocalCode(Long configId, String mappingType, String erpCode) {
        return dataMappingEngine.toLocalCode(configId, mappingType, erpCode);
    }

    @Override
    public void refreshCache(Long configId) {
        dataMappingEngine.refreshCache(configId);
    }

    @Override
    public void refreshCache(Long configId, String mappingType) {
        dataMappingEngine.refreshCache(configId, mappingType);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean batchSave(Long configId, String mappingType, List<ErpDataMapping> mappings) {
        if (configId == null || StrUtil.isBlank(mappingType) || mappings == null) {
            throw new BusinessException("参数不完整");
        }
        this.lambdaUpdate()
                .eq(ErpDataMapping::getConfigId, configId)
                .eq(ErpDataMapping::getMappingType, mappingType)
                .remove();
        int sort = 1;
        for (ErpDataMapping mapping : mappings) {
            mapping.setId(null);
            mapping.setConfigId(configId);
            mapping.setMappingType(mappingType);
            if (mapping.getSort() == null) mapping.setSort(sort++);
            if (mapping.getStatus() == null) mapping.setStatus(1);
            this.save(mapping);
        }
        dataMappingEngine.refreshCache(configId, mappingType);
        return true;
    }
}
