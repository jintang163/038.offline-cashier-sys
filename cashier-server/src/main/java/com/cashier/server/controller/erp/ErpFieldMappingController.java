package com.cashier.server.controller.erp;

import com.cashier.server.common.Result;
import com.cashier.server.entity.erp.ErpFieldMapping;
import com.cashier.server.service.erp.ErpFieldMappingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/erp/field-mapping")
public class ErpFieldMappingController {

    @Autowired
    private ErpFieldMappingService fieldMappingService;

    @GetMapping("/list/{interfaceMappingId}")
    public Result<List<ErpFieldMapping>> listByInterfaceId(@PathVariable Long interfaceMappingId) {
        return Result.success(fieldMappingService.listByInterfaceId(interfaceMappingId));
    }

    @GetMapping("/list/{interfaceMappingId}/{direction}")
    public Result<List<ErpFieldMapping>> listByInterfaceAndDirection(
            @PathVariable Long interfaceMappingId,
            @PathVariable String direction) {
        return Result.success(fieldMappingService.listByInterfaceAndDirection(interfaceMappingId, direction));
    }

    @GetMapping("/{id}")
    public Result<ErpFieldMapping> getById(@PathVariable Long id) {
        return Result.success(fieldMappingService.getById(id));
    }

    @PostMapping
    public Result<Void> save(@RequestBody ErpFieldMapping entity) {
        boolean success = fieldMappingService.save(entity);
        return success ? Result.success() : Result.fail("保存失败");
    }

    @PutMapping
    public Result<Void> update(@RequestBody ErpFieldMapping entity) {
        boolean success = fieldMappingService.update(entity);
        return success ? Result.success() : Result.fail("更新失败");
    }

    @DeleteMapping("/{id}")
    public Result<Void> remove(@PathVariable Long id) {
        boolean success = fieldMappingService.removeById(id);
        return success ? Result.success() : Result.fail("删除失败");
    }

    @PutMapping("/{id}/status")
    public Result<Void> updateStatus(@PathVariable Long id, @RequestParam Integer status) {
        boolean success = fieldMappingService.updateStatus(id, status);
        return success ? Result.success() : Result.fail("更新状态失败");
    }

    @PostMapping("/batch/{interfaceMappingId}/{direction}")
    public Result<Void> batchSaveOrUpdate(
            @PathVariable Long interfaceMappingId,
            @PathVariable String direction,
            @RequestBody List<ErpFieldMapping> mappings) {
        boolean success = fieldMappingService.batchSaveOrUpdate(interfaceMappingId, direction, mappings);
        return success ? Result.success() : Result.fail("批量保存失败");
    }
}
