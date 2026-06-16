package com.cashier.server.controller.erp;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.Result;
import com.cashier.server.entity.erp.ErpInterfaceMapping;
import com.cashier.server.service.erp.ErpInterfaceMappingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/erp/interface-mapping")
public class ErpInterfaceMappingController {

    @Autowired
    private ErpInterfaceMappingService interfaceMappingService;

    @GetMapping("/page")
    public Result<IPage<ErpInterfaceMapping>> page(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) Long configId,
            @RequestParam(required = false) String businessType,
            @RequestParam(required = false) String syncDirection) {
        return Result.success(interfaceMappingService.page(pageNum, pageSize, configId, businessType, syncDirection));
    }

    @GetMapping("/list")
    public Result<IPage<ErpInterfaceMapping>> list(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) Long configId,
            @RequestParam(required = false) String businessType,
            @RequestParam(required = false) String syncDirection) {
        return page(pageNum, pageSize, configId, businessType, syncDirection);
    }

    @GetMapping("/list/{configId}")
    public Result<List<ErpInterfaceMapping>> listByConfigId(@PathVariable Long configId) {
        return Result.success(interfaceMappingService.listByConfigId(configId));
    }

    @GetMapping("/list/{configId}/{syncDirection}")
    public Result<List<ErpInterfaceMapping>> listByConfigAndDirection(
            @PathVariable Long configId,
            @PathVariable String syncDirection) {
        return Result.success(interfaceMappingService.listByConfigAndDirection(configId, syncDirection));
    }

    @GetMapping("/{id}")
    public Result<ErpInterfaceMapping> getById(@PathVariable Long id) {
        return Result.success(interfaceMappingService.getById(id));
    }

    @GetMapping("/business/{configId}/{businessType}")
    public Result<ErpInterfaceMapping> getByBusinessType(
            @PathVariable Long configId,
            @PathVariable String businessType) {
        return Result.success(interfaceMappingService.getByBusinessType(configId, businessType));
    }

    @PostMapping
    public Result<Void> save(@RequestBody ErpInterfaceMapping entity) {
        boolean success = interfaceMappingService.save(entity);
        return success ? Result.success() : Result.fail("保存失败");
    }

    @PutMapping
    public Result<Void> update(@RequestBody ErpInterfaceMapping entity) {
        boolean success = interfaceMappingService.update(entity);
        return success ? Result.success() : Result.fail("更新失败");
    }

    @PutMapping("/{id}")
    public Result<Void> updateById(@PathVariable Long id, @RequestBody ErpInterfaceMapping entity) {
        entity.setId(id);
        boolean success = interfaceMappingService.update(entity);
        return success ? Result.success() : Result.fail("更新失败");
    }

    @DeleteMapping("/{id}")
    public Result<Void> remove(@PathVariable Long id) {
        boolean success = interfaceMappingService.removeById(id);
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
        boolean success = interfaceMappingService.updateStatus(id, status);
        return success ? Result.success() : Result.fail("更新状态失败");
    }
}
