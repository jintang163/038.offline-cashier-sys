package com.cashier.server.service.erp;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.common.BusinessException;
import com.cashier.server.entity.erp.ErpSyncTask;
import com.cashier.server.mapper.erp.ErpSyncTaskMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ErpSyncTaskServiceImpl extends ServiceImpl<ErpSyncTaskMapper, ErpSyncTask> implements ErpSyncTaskService {

    @Autowired
    private DynamicTaskScheduler dynamicTaskScheduler;

    @Override
    public IPage<ErpSyncTask> page(int pageNum, int pageSize, Long configId, String businessType, Integer enabled) {
        Page<ErpSyncTask> page = new Page<>(pageNum, pageSize);
        com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ErpSyncTask> wrapper =
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<>();
        if (configId != null) {
            wrapper.eq(ErpSyncTask::getConfigId, configId);
        }
        if (StrUtil.isNotBlank(businessType)) {
            wrapper.eq(ErpSyncTask::getBusinessType, businessType);
        }
        if (enabled != null) {
            wrapper.eq(ErpSyncTask::getEnabled, enabled);
        }
        wrapper.orderByAsc(ErpSyncTask::getTaskCode);
        return this.page(page, wrapper);
    }

    @Override
    public List<ErpSyncTask> listAll() {
        return this.lambdaQuery()
                .eq(ErpSyncTask::getStatus, 1)
                .orderByAsc(ErpSyncTask::getTaskCode)
                .list();
    }

    @Override
    public List<ErpSyncTask> listEnabled() {
        return this.lambdaQuery()
                .eq(ErpSyncTask::getStatus, 1)
                .eq(ErpSyncTask::getEnabled, 1)
                .orderByAsc(ErpSyncTask::getTaskCode)
                .list();
    }

    @Override
    public ErpSyncTask getById(Long id) {
        return this.baseMapper.selectById(id);
    }

    @Override
    public boolean save(ErpSyncTask entity) {
        if (StrUtil.isBlank(entity.getTaskCode()) || StrUtil.isBlank(entity.getTaskName())) {
            throw new BusinessException("任务编码和名称不能为空");
        }
        ErpSyncTask exist = this.lambdaQuery().eq(ErpSyncTask::getTaskCode, entity.getTaskCode()).one();
        if (exist != null) {
            throw new BusinessException("任务编码已存在");
        }
        if (StrUtil.isBlank(entity.getCronExpression()) && (entity.getExecuteInterval() == null || entity.getExecuteInterval() <= 0)) {
            throw new BusinessException("Cron表达式和执行间隔不能同时为空");
        }
        if (entity.getPageSize() == null) entity.setPageSize(100);
        if (entity.getEnabled() == null) entity.setEnabled(1);
        if (entity.getStatus() == null) entity.setStatus(1);
        boolean result = this.save(entity);
        if (result && entity.getEnabled() == 1) {
            dynamicTaskScheduler.scheduleTask(entity);
        }
        return result;
    }

    @Override
    public boolean update(ErpSyncTask entity) {
        if (entity.getId() == null) {
            throw new BusinessException("ID不能为空");
        }
        boolean result = this.updateById(entity);
        if (result) {
            dynamicTaskScheduler.refreshTask(entity.getId());
        }
        return result;
    }

    @Override
    public boolean removeById(Long id) {
        ErpSyncTask task = this.getById(id);
        if (task == null) {
            return false;
        }
        dynamicTaskScheduler.cancelTask(id);
        return this.removeById(id);
    }

    @Override
    public boolean updateStatus(Long id, Integer status) {
        if (status == null || (status != 0 && status != 1)) {
            throw new BusinessException("无效的状态值");
        }
        boolean result = this.lambdaUpdate()
                .eq(ErpSyncTask::getId, id)
                .set(ErpSyncTask::getStatus, status)
                .update();
        if (result) {
            dynamicTaskScheduler.refreshTask(id);
        }
        return result;
    }

    @Override
    public boolean updateEnabled(Long id, Integer enabled) {
        if (enabled == null || (enabled != 0 && enabled != 1)) {
            throw new BusinessException("无效的启用状态");
        }
        boolean result = this.lambdaUpdate()
                .eq(ErpSyncTask::getId, id)
                .set(ErpSyncTask::getEnabled, enabled)
                .update();
        if (result) {
            dynamicTaskScheduler.refreshTask(id);
        }
        return result;
    }

    @Override
    public void executeManually(Long id) {
        dynamicTaskScheduler.executeTaskManually(id);
    }

    @Override
    public void refreshTask(Long id) {
        dynamicTaskScheduler.refreshTask(id);
    }

    @Override
    public void refreshAll() {
        dynamicTaskScheduler.refreshAllTasks();
    }
}
