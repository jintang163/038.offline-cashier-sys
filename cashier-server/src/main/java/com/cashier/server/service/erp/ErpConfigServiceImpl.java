package com.cashier.server.service.erp;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.common.BusinessException;
import com.cashier.server.entity.erp.ErpConfig;
import com.cashier.server.mapper.erp.ErpConfigMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ErpConfigServiceImpl extends ServiceImpl<ErpConfigMapper, ErpConfig> implements ErpConfigService {

    @Autowired
    private DynamicErpConfigManager dynamicErpConfigManager;

    @Autowired
    private DynamicTaskScheduler dynamicTaskScheduler;

    @Override
    public IPage<ErpConfig> page(int pageNum, int pageSize, String keyword, Integer status) {
        Page<ErpConfig> page = new Page<>(pageNum, pageSize);
        com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ErpConfig> wrapper =
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<>();
        if (StrUtil.isNotBlank(keyword)) {
            wrapper.like(ErpConfig::getConfigCode, keyword)
                    .or().like(ErpConfig::getConfigName, keyword);
        }
        if (status != null) {
            wrapper.eq(ErpConfig::getStatus, status);
        }
        wrapper.orderByDesc(ErpConfig::getIsDefault).orderByAsc(ErpConfig::getConfigCode);
        return this.page(page, wrapper);
    }

    @Override
    public List<ErpConfig> listAll() {
        return dynamicErpConfigManager.getAllConfigs();
    }

    @Override
    public ErpConfig getById(Long id) {
        return dynamicErpConfigManager.getConfigById(id);
    }

    @Override
    public ErpConfig getDefault() {
        return dynamicErpConfigManager.getDefaultConfig();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean save(ErpConfig config) {
        if (!dynamicErpConfigManager.isValidErpType(config.getErpType())) {
            throw new BusinessException("无效的ERP类型");
        }
        if (!dynamicErpConfigManager.isValidAuthType(config.getAuthType())) {
            throw new BusinessException("无效的认证方式");
        }
        if (config.getTimeout() == null) config.setTimeout(30000);
        if (config.getRetryTimes() == null) config.setRetryTimes(3);
        if (config.getRetryInterval() == null) config.setRetryInterval(5000);
        if (config.getStatus() == null) config.setStatus(1);
        if (config.getIsDefault() == null) config.setIsDefault(0);

        ErpConfig exist = this.lambdaQuery().eq(ErpConfig::getConfigCode, config.getConfigCode()).one();
        if (exist != null) {
            throw new BusinessException("配置编码已存在");
        }

        boolean result = this.save(config);
        if (result) {
            dynamicErpConfigManager.refreshCache();
        }
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean update(ErpConfig config) {
        if (config.getId() == null) {
            throw new BusinessException("ID不能为空");
        }
        if (config.getErpType() != null && !dynamicErpConfigManager.isValidErpType(config.getErpType())) {
            throw new BusinessException("无效的ERP类型");
        }
        if (config.getAuthType() != null && !dynamicErpConfigManager.isValidAuthType(config.getAuthType())) {
            throw new BusinessException("无效的认证方式");
        }
        boolean result = this.updateById(config);
        if (result) {
            dynamicErpConfigManager.refreshCache(config.getId());
            dynamicTaskScheduler.refreshAllTasks();
        }
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean removeById(Long id) {
        ErpConfig config = this.getById(id);
        if (config == null) {
            throw new BusinessException("配置不存在");
        }
        if (config.getIsDefault() != null && config.getIsDefault() == 1) {
            throw new BusinessException("默认配置不能删除");
        }
        boolean result = this.removeById(id);
        if (result) {
            dynamicErpConfigManager.refreshCache(id);
        }
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean setDefault(Long id) {
        ErpConfig config = this.getById(id);
        if (config == null) {
            throw new BusinessException("配置不存在");
        }
        this.lambdaUpdate().eq(ErpConfig::getIsDefault, 1).set(ErpConfig::getIsDefault, 0).update();
        this.lambdaUpdate().eq(ErpConfig::getId, id).set(ErpConfig::getIsDefault, 1).update();
        dynamicErpConfigManager.refreshCache();
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateStatus(Long id, Integer status) {
        if (status == null || (status != 0 && status != 1)) {
            throw new BusinessException("无效的状态值");
        }
        ErpConfig config = this.getById(id);
        if (config == null) {
            throw new BusinessException("配置不存在");
        }
        if (config.getIsDefault() != null && config.getIsDefault() == 1 && status == 0) {
            throw new BusinessException("默认配置不能禁用");
        }
        this.lambdaUpdate().eq(ErpConfig::getId, id).set(ErpConfig::getStatus, status).update();
        dynamicErpConfigManager.refreshCache(id);
        dynamicTaskScheduler.refreshAllTasks();
        return true;
    }

    @Override
    public void refreshCache() {
        dynamicErpConfigManager.refreshCache();
        dynamicTaskScheduler.refreshAllTasks();
    }

    @Override
    public void refreshCache(Long id) {
        dynamicErpConfigManager.refreshCache(id);
        dynamicTaskScheduler.refreshAllTasks();
    }
}
