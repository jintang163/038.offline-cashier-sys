package com.cashier.server.controller.erp;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.Result;
import com.cashier.server.entity.erp.ErpSyncTask;
import com.cashier.server.service.erp.ErpSyncTaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/erp/sync-task")
public class ErpSyncTaskController {

    @Autowired
    private ErpSyncTaskService syncTaskService;

    @GetMapping("/page")
    public Result<IPage<ErpSyncTask>> page(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) Long configId,
            @RequestParam(required = false) String businessType,
            @RequestParam(required = false) Integer enabled) {
        return Result.success(syncTaskService.page(pageNum, pageSize, configId, businessType, enabled));
    }

    @GetMapping("/list")
    public Result<List<ErpSyncTask>> listAll() {
        return Result.success(syncTaskService.listAll());
    }

    @GetMapping("/list/enabled")
    public Result<List<ErpSyncTask>> listEnabled() {
        return Result.success(syncTaskService.listEnabled());
    }

    @GetMapping("/{id}")
    public Result<ErpSyncTask> getById(@PathVariable Long id) {
        return Result.success(syncTaskService.getById(id));
    }

    @PostMapping
    public Result<Void> save(@RequestBody ErpSyncTask entity) {
        boolean success = syncTaskService.save(entity);
        return success ? Result.success() : Result.fail("保存失败");
    }

    @PutMapping
    public Result<Void> update(@RequestBody ErpSyncTask entity) {
        boolean success = syncTaskService.update(entity);
        return success ? Result.success() : Result.fail("更新失败");
    }

    @PutMapping("/{id}")
    public Result<Void> updateById(@PathVariable Long id, @RequestBody ErpSyncTask entity) {
        entity.setId(id);
        boolean success = syncTaskService.update(entity);
        return success ? Result.success() : Result.fail("更新失败");
    }

    @DeleteMapping("/{id}")
    public Result<Void> remove(@PathVariable Long id) {
        boolean success = syncTaskService.removeById(id);
        return success ? Result.success() : Result.fail("删除失败");
    }

    @PutMapping("/{id}/status")
    public Result<Void> updateStatus(@PathVariable Long id, @RequestParam(required = false) Integer status, @RequestBody(required = false) Map<String, Object> body) {
        if (status == null && body != null && body.get("status") != null) {
            status = Integer.valueOf(body.get("status").toString());
        }
        if (status == null) {
            return Result.fail("status参数不能为空");
        }
        boolean success = syncTaskService.updateStatus(id, status);
        return success ? Result.success() : Result.fail("更新状态失败");
    }

    @PutMapping("/{id}/enabled")
    public Result<Void> updateEnabled(@PathVariable Long id, @RequestParam Integer enabled) {
        boolean success = syncTaskService.updateEnabled(id, enabled);
        return success ? Result.success() : Result.fail("更新启用状态失败");
    }

    @PostMapping("/execute/{id}")
    public Result<Void> executeManually(@PathVariable Long id) {
        syncTaskService.executeManually(id);
        return Result.success();
    }

    @PostMapping("/{id}/execute")
    public Result<Void> executeById(@PathVariable Long id) {
        syncTaskService.executeManually(id);
        return Result.success();
    }

    @PostMapping("/refresh/{id}")
    public Result<Void> refreshTask(@PathVariable Long id) {
        syncTaskService.refreshTask(id);
        return Result.success();
    }

    @PostMapping("/refresh-all")
    public Result<Void> refreshAll() {
        syncTaskService.refreshAll();
        return Result.success();
    }

    @PostMapping("/refresh-scheduler")
    public Result<Void> refreshScheduler() {
        syncTaskService.refreshAll();
        return Result.success();
    }
}
