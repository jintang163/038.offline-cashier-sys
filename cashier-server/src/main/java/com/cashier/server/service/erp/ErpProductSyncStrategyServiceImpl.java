package com.cashier.server.service.erp;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.common.BusinessException;
import com.cashier.server.entity.erp.ErpProductSyncStrategy;
import com.cashier.server.mapper.erp.ErpProductSyncStrategyMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class ErpProductSyncStrategyServiceImpl extends ServiceImpl<ErpProductSyncStrategyMapper, ErpProductSyncStrategy> implements ErpProductSyncStrategyService {

    @Override
    public ErpProductSyncStrategy getByConfigId(Long configId) {
        if (configId == null) {
            return null;
        }
        return this.lambdaQuery()
                .eq(ErpProductSyncStrategy::getConfigId, configId)
                .eq(ErpProductSyncStrategy::getStatus, 1)
                .one();
    }

    @Override
    public ErpProductSyncStrategy getById(Long id) {
        return this.baseMapper.selectById(id);
    }

    @Override
    public boolean save(ErpProductSyncStrategy entity) {
        if (entity.getConfigId() == null) {
            throw new BusinessException("ERP配置ID不能为空");
        }
        ErpProductSyncStrategy exist = getByConfigId(entity.getConfigId());
        if (exist != null) {
            throw new BusinessException("该ERP配置已存在商品同步策略");
        }
        if (StrUtil.isBlank(entity.getStrategyName())) entity.setStrategyName("商品同步策略");
        if (StrUtil.isBlank(entity.getFullSyncCron())) entity.setFullSyncCron("0 0 2 * * ?");
        if (entity.getFullSyncEnabled() == null) entity.setFullSyncEnabled(1);
        if (StrUtil.isBlank(entity.getIncrementalSyncCron())) entity.setIncrementalSyncCron("0 0/30 * * * ?");
        if (entity.getIncrementalSyncEnabled() == null) entity.setIncrementalSyncEnabled(1);
        if (StrUtil.isBlank(entity.getIncrementalFields())) entity.setIncrementalFields("stock,price,status");
        if (StrUtil.isBlank(entity.getSyncTimeField())) entity.setSyncTimeField("updateTime");
        if (entity.getPageSize() == null) entity.setPageSize(500);
        if (entity.getEnableStockSync() == null) entity.setEnableStockSync(1);
        if (entity.getEnablePriceSync() == null) entity.setEnablePriceSync(1);
        if (entity.getEnableCategorySync() == null) entity.setEnableCategorySync(1);
        if (entity.getStatus() == null) entity.setStatus(1);
        return this.save(entity);
    }

    @Override
    public boolean update(ErpProductSyncStrategy entity) {
        if (entity.getId() == null) {
            throw new BusinessException("ID不能为空");
        }
        return this.updateById(entity);
    }

    @Override
    public boolean updateFullSyncStatus(Long configId, Integer enabled) {
        if (enabled == null || (enabled != 0 && enabled != 1)) {
            throw new BusinessException("无效的启用状态");
        }
        return this.lambdaUpdate()
                .eq(ErpProductSyncStrategy::getConfigId, configId)
                .set(ErpProductSyncStrategy::getFullSyncEnabled, enabled)
                .update();
    }

    @Override
    public boolean updateIncrementalSyncStatus(Long configId, Integer enabled) {
        if (enabled == null || (enabled != 0 && enabled != 1)) {
            throw new BusinessException("无效的启用状态");
        }
        return this.lambdaUpdate()
                .eq(ErpProductSyncStrategy::getConfigId, configId)
                .set(ErpProductSyncStrategy::getIncrementalSyncEnabled, enabled)
                .update();
    }

    @Override
    public void updateLastFullSyncTime(Long configId) {
        this.lambdaUpdate()
                .eq(ErpProductSyncStrategy::getConfigId, configId)
                .set(ErpProductSyncStrategy::getLastFullSyncTime, LocalDateTime.now())
                .update();
    }

    @Override
    public void updateLastIncrementalSyncTime(Long configId) {
        this.lambdaUpdate()
                .eq(ErpProductSyncStrategy::getConfigId, configId)
                .set(ErpProductSyncStrategy::getLastIncrementalSyncTime, LocalDateTime.now())
                .update();
    }
}
