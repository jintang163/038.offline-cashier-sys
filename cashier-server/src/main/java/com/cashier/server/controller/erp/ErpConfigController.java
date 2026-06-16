package com.cashier.server.controller.erp;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.Result;
import com.cashier.server.entity.erp.ErpConfig;
import com.cashier.server.service.erp.ErpConfigService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/erp/config")
public class ErpConfigController {

    @Autowired
    private ErpConfigService erpConfigService;

    @GetMapping("/page")
    public Result<IPage<ErpConfig>> page(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer status) {
        return Result.success(erpConfigService.page(pageNum, pageSize, keyword, status));
    }

    @GetMapping("/list")
    public Result<List<ErpConfig>> list() {
        return Result.success(erpConfigService.listAll());
    }

    @GetMapping("/{id}")
    public Result<ErpConfig> getById(@PathVariable Long id) {
        return Result.success(erpConfigService.getById(id));
    }

    @GetMapping("/default")
    public Result<ErpConfig> getDefault() {
        return Result.success(erpConfigService.getDefault());
    }

    @PostMapping
    public Result<Void> save(@RequestBody ErpConfig config) {
        boolean success = erpConfigService.save(config);
        return success ? Result.success() : Result.fail("保存失败");
    }

    @PutMapping
    public Result<Void> update(@RequestBody ErpConfig config) {
        boolean success = erpConfigService.update(config);
        return success ? Result.success() : Result.fail("更新失败");
    }

    @DeleteMapping("/{id}")
    public Result<Void> remove(@PathVariable Long id) {
        boolean success = erpConfigService.removeById(id);
        return success ? Result.success() : Result.fail("删除失败");
    }

    @PutMapping("/{id}/default")
    public Result<Void> setDefault(@PathVariable Long id) {
        boolean success = erpConfigService.setDefault(id);
        return success ? Result.success() : Result.fail("设置默认失败");
    }

    @PutMapping("/{id}/status")
    public Result<Void> updateStatus(@PathVariable Long id, @RequestParam Integer status) {
        boolean success = erpConfigService.updateStatus(id, status);
        return success ? Result.success() : Result.fail("更新状态失败");
    }

    @PostMapping("/refresh-cache")
    public Result<Void> refreshCache() {
        erpConfigService.refreshCache();
        return Result.success();
    }
}
