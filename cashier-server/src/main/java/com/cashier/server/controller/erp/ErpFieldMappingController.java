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

    @GetMapping("/list")
    public Result<List<ErpFieldMapping>> list(
            @RequestParam(required = false) Long interfaceMappingId,
            @RequestParam(required = false) String direction) {
        if (interfaceMappingId == null) {
            return Result.success(java.util.Collections.emptyList());
        }
        if (direction != null) {
            return Result.success(fieldMappingService.listByInterfaceAndDirection(interfaceMappingId, direction));
        }
        return Result.success(fieldMappingService.listByInterfaceId(interfaceMappingId));
    }

    @PostMapping("/batch-save")
    public Result<Void> batchSave(@RequestBody Object body) {
        Long interfaceMappingId = null;
        String direction = "REQUEST";
        List<ErpFieldMapping> mappings;

        if (body instanceof List) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> list = (List<Map<String, Object>>) body;
            mappings = new java.util.ArrayList<>();
            for (Map<String, Object> item : list) {
                ErpFieldMapping mapping = new ErpFieldMapping();
                if (item.get("id") != null) {
                    mapping.setId(Long.valueOf(item.get("id").toString()));
                }
                if (item.get("interfaceMappingId") != null) {
                    mapping.setInterfaceMappingId(Long.valueOf(item.get("interfaceMappingId").toString()));
                }
                if (item.get("direction") != null) {
                    mapping.setMappingDirection(item.get("direction").toString());
                } else if (item.get("mappingDirection") != null) {
                    mapping.setMappingDirection(item.get("mappingDirection").toString());
                }
                if (item.get("localField") != null) {
                    mapping.setLocalField(item.get("localField").toString());
                }
                if (item.get("localFieldType") != null) {
                    mapping.setLocalFieldType(item.get("localFieldType").toString());
                }
                if (item.get("erpField") != null) {
                    mapping.setErpField(item.get("erpField").toString());
                }
                if (item.get("erpFieldType") != null) {
                    mapping.setErpFieldType(item.get("erpFieldType").toString());
                }
                if (item.get("isRequired") != null) {
                    mapping.setIsRequired(Integer.valueOf(item.get("isRequired").toString()));
                }
                if (item.get("defaultValue") != null) {
                    mapping.setDefaultValue(item.get("defaultValue").toString());
                }
                if (item.get("transformExpression") != null) {
                    mapping.setTransformExpression(item.get("transformExpression").toString());
                }
                if (item.get("sort") != null) {
                    mapping.setSort(Integer.valueOf(item.get("sort").toString()));
                }
                if (item.get("status") != null) {
                    mapping.setStatus(Integer.valueOf(item.get("status").toString()));
                }
                if (item.get("remark") != null) {
                    mapping.setRemark(item.get("remark").toString());
                }
                mappings.add(mapping);
            }
            if (!mappings.isEmpty()) {
                ErpFieldMapping first = mappings.get(0);
                if (first.getInterfaceMappingId() != null) {
                    interfaceMappingId = first.getInterfaceMappingId();
                }
                if (first.getMappingDirection() != null) {
                    direction = first.getMappingDirection();
                }
            }
        } else if (body instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> params = (Map<String, Object>) body;
            interfaceMappingId = params.get("interfaceMappingId") != null
                    ? Long.valueOf(params.get("interfaceMappingId").toString()) : null;
            direction = params.get("direction") != null ? params.get("direction").toString() : "REQUEST";
            @SuppressWarnings("unchecked")
            List<ErpFieldMapping> list = params.get("mappings") != null
                    ? (List<ErpFieldMapping>) params.get("mappings") : java.util.Collections.emptyList();
            mappings = list;
        } else {
            return Result.fail("请求参数格式错误");
        }

        if (interfaceMappingId == null) {
            return Result.fail("interfaceMappingId不能为空");
        }
        boolean success = fieldMappingService.batchSaveOrUpdate(interfaceMappingId, direction, mappings);
        return success ? Result.success() : Result.fail("批量保存失败");
    }
}
