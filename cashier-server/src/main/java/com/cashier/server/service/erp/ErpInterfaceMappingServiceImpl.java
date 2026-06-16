package com.cashier.server.service.erp;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.common.BusinessException;
import com.cashier.server.entity.erp.ErpInterfaceMapping;
import com.cashier.server.mapper.erp.ErpInterfaceMappingMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ErpInterfaceMappingServiceImpl extends ServiceImpl<ErpInterfaceMappingMapper, ErpInterfaceMapping> implements ErpInterfaceMappingService {

    @Override
    public IPage<ErpInterfaceMapping> page(int pageNum, int pageSize, Long configId, String businessType, String syncDirection) {
        Page<ErpInterfaceMapping> page = new Page<>(pageNum, pageSize);
        com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ErpInterfaceMapping> wrapper =
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<>();
        if (configId != null) {
            wrapper.eq(ErpInterfaceMapping::getConfigId, configId);
        }
        if (StrUtil.isNotBlank(businessType)) {
            wrapper.eq(ErpInterfaceMapping::getBusinessType, businessType);
        }
        if (StrUtil.isNotBlank(syncDirection)) {
            wrapper.eq(ErpInterfaceMapping::getSyncDirection, syncDirection);
        }
        wrapper.orderByAsc(ErpInterfaceMapping::getBusinessType);
        return this.page(page, wrapper);
    }

    @Override
    public List<ErpInterfaceMapping> listByConfigId(Long configId) {
        return this.lambdaQuery()
                .eq(ErpInterfaceMapping::getConfigId, configId)
                .eq(ErpInterfaceMapping::getStatus, 1)
                .orderByAsc(ErpInterfaceMapping::getBusinessType)
                .list();
    }

    @Override
    public ErpInterfaceMapping getById(Long id) {
        return this.baseMapper.selectById(id);
    }

    @Override
    public ErpInterfaceMapping getByBusinessType(Long configId, String businessType) {
        return this.lambdaQuery()
                .eq(ErpInterfaceMapping::getConfigId, configId)
                .eq(ErpInterfaceMapping::getBusinessType, businessType)
                .eq(ErpInterfaceMapping::getStatus, 1)
                .one();
    }

    @Override
    public ErpInterfaceMapping getByBusinessType(Long configId, String businessType, String syncDirection) {
        return this.lambdaQuery()
                .eq(ErpInterfaceMapping::getConfigId, configId)
                .eq(ErpInterfaceMapping::getBusinessType, businessType)
                .eq(ErpInterfaceMapping::getSyncDirection, syncDirection)
                .eq(ErpInterfaceMapping::getStatus, 1)
                .one();
    }

    @Override
    public boolean save(ErpInterfaceMapping entity) {
        ErpInterfaceMapping exist = this.lambdaQuery()
                .eq(ErpInterfaceMapping::getConfigId, entity.getConfigId())
                .eq(ErpInterfaceMapping::getBusinessType, entity.getBusinessType())
                .one();
        if (exist != null) {
            throw new BusinessException("该业务类型的接口映射已存在");
        }
        if (entity.getStatus() == null) entity.setStatus(1);
        if (StrUtil.isBlank(entity.getHttpMethod())) entity.setHttpMethod("POST");
        if (StrUtil.isBlank(entity.getRequestContentType())) entity.setRequestContentType("application/json");
        if (StrUtil.isBlank(entity.getResponseDataPath())) entity.setResponseDataPath("data");
        if (StrUtil.isBlank(entity.getResponseCodeField())) entity.setResponseCodeField("code");
        if (StrUtil.isBlank(entity.getResponseSuccessCode())) entity.setResponseSuccessCode("200");
        if (StrUtil.isBlank(entity.getResponseMessageField())) entity.setResponseMessageField("message");
        return this.save(entity);
    }

    @Override
    public boolean update(ErpInterfaceMapping entity) {
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
                .eq(ErpInterfaceMapping::getId, id)
                .set(ErpInterfaceMapping::getStatus, status)
                .update();
    }

    @Override
    public List<ErpInterfaceMapping> listByConfigAndDirection(Long configId, String syncDirection) {
        return this.lambdaQuery()
                .eq(ErpInterfaceMapping::getConfigId, configId)
                .eq(ErpInterfaceMapping::getSyncDirection, syncDirection)
                .eq(ErpInterfaceMapping::getStatus, 1)
                .orderByAsc(ErpInterfaceMapping::getBusinessType)
                .list();
    }
}
