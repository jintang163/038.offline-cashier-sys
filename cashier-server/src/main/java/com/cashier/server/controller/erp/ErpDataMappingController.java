package com.cashier.server.controller.erp;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.Result;
import com.cashier.server.entity.erp.ErpDataMapping;
import com.cashier.server.service.erp.ErpDataMappingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/erp/data-mapping")
public class ErpDataMappingController {

    @Autowired
    private ErpDataMappingService dataMappingService;

    @GetMapping("/page")
    public Result<IPage<ErpDataMapping>> page(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) Long configId,
            @RequestParam(required = false) String mappingType,
            @RequestParam(required = false) String keyword) {
        return Result.success(dataMappingService.page(pageNum, pageSize, configId, mappingType, keyword));
    }

    @GetMapping("/list/{configId}/{mappingType}")
    public Result<List<ErpDataMapping>> listByType(
            @PathVariable Long configId,
            @PathVariable String mappingType) {
        return Result.success(dataMappingService.listByType(configId, mappingType));
    }

    @GetMapping("/{id}")
    public Result<ErpDataMapping> getById(@PathVariable Long id) {
        return Result.success(dataMappingService.getById(id));
    }

    @PostMapping
    public Result<Void> save(@RequestBody ErpDataMapping entity) {
        boolean success = dataMappingService.save(entity);
        return success ? Result.success() : Result.fail("保存失败");
    }

    @PutMapping
    public Result<Void> update(@RequestBody ErpDataMapping entity) {
        boolean success = dataMappingService.update(entity);
        return success ? Result.success() : Result.fail("更新失败");
    }

    @PutMapping("/{id}")
    public Result<Void> updateById(@PathVariable Long id, @RequestBody ErpDataMapping entity) {
        entity.setId(id);
        boolean success = dataMappingService.update(entity);
        return success ? Result.success() : Result.fail("更新失败");
    }

    @DeleteMapping("/{id}")
    public Result<Void> remove(@PathVariable Long id) {
        boolean success = dataMappingService.removeById(id);
        return success ? Result.success() : Result.fail("删除失败");
    }

    @PutMapping("/{id}/status")
    public Result<Void> updateStatus(@PathVariable Long id, @RequestParam Integer status) {
        boolean success = dataMappingService.updateStatus(id, status);
        return success ? Result.success() : Result.fail("更新状态失败");
    }

    @GetMapping("/to-erp/{configId}/{mappingType}/{localCode}")
    public Result<String> toErpCode(
            @PathVariable Long configId,
            @PathVariable String mappingType,
            @PathVariable String localCode) {
        return Result.success(dataMappingService.toErpCode(configId, mappingType, localCode));
    }

    @GetMapping("/to-local/{configId}/{mappingType}/{erpCode}")
    public Result<String> toLocalCode(
            @PathVariable Long configId,
            @PathVariable String mappingType,
            @PathVariable String erpCode) {
        return Result.success(dataMappingService.toLocalCode(configId, mappingType, erpCode));
    }

    @GetMapping("/map/{configId}/{mappingType}")
    public Result<Map<String, String>> getMappingMap(
            @PathVariable Long configId,
            @PathVariable String mappingType,
            @RequestParam(defaultValue = "localToErp") String direction) {
        if ("erpToLocal".equals(direction)) {
            return Result.success(dataMappingService.getErpToLocalMap(configId, mappingType));
        }
        return Result.success(dataMappingService.getLocalToErpMap(configId, mappingType));
    }

    @PostMapping("/refresh-cache/{configId}")
    public Result<Void> refreshCache(
            @PathVariable Long configId,
            @RequestParam(required = false) String mappingType) {
        if (mappingType != null) {
            dataMappingService.refreshCache(configId, mappingType);
        } else {
            dataMappingService.refreshCache(configId);
        }
        return Result.success();
    }

    @PostMapping("/batch/{configId}/{mappingType}")
    public Result<Void> batchSave(
            @PathVariable Long configId,
            @PathVariable String mappingType,
            @RequestBody List<ErpDataMapping> mappings) {
        boolean success = dataMappingService.batchSave(configId, mappingType, mappings);
        return success ? Result.success() : Result.fail("批量保存失败");
    }

    @GetMapping("/list")
    public Result<IPage<ErpDataMapping>> list(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) Long configId,
            @RequestParam(required = false) String mappingType,
            @RequestParam(required = false) String keyword) {
        return page(pageNum, pageSize, configId, mappingType, keyword);
    }

    @PostMapping("/batch-save")
    public Result<Void> batchSaveByBody(@RequestBody Object body) {
        Long configId = null;
        String mappingType = null;
        List<ErpDataMapping> mappings;

        if (body instanceof List) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> list = (List<Map<String, Object>>) body;
            mappings = new java.util.ArrayList<>();
            for (Map<String, Object> item : list) {
                ErpDataMapping mapping = new ErpDataMapping();
                if (item.get("id") != null) {
                    mapping.setId(Long.valueOf(item.get("id").toString()));
                }
                if (item.get("configId") != null) {
                    mapping.setConfigId(Long.valueOf(item.get("configId").toString()));
                }
                if (item.get("mappingType") != null) {
                    mapping.setMappingType(item.get("mappingType").toString());
                }
                if (item.get("mappingCode") != null) {
                    mapping.setMappingCode(item.get("mappingCode").toString());
                } else if (item.get("localValue") != null) {
                    mapping.setMappingCode(item.get("localValue").toString());
                }
                if (item.get("mappingName") != null) {
                    mapping.setMappingName(item.get("mappingName").toString());
                } else if (item.get("localValueDesc") != null) {
                    mapping.setMappingName(item.get("localValueDesc").toString());
                }
                if (item.get("erpCode") != null) {
                    mapping.setErpCode(item.get("erpCode").toString());
                } else if (item.get("erpValue") != null) {
                    mapping.setErpCode(item.get("erpValue").toString());
                }
                if (item.get("erpName") != null) {
                    mapping.setErpName(item.get("erpName").toString());
                } else if (item.get("erpValueDesc") != null) {
                    mapping.setErpName(item.get("erpValueDesc").toString());
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
                ErpDataMapping first = mappings.get(0);
                if (first.getConfigId() != null) {
                    configId = first.getConfigId();
                }
                if (first.getMappingType() != null) {
                    mappingType = first.getMappingType();
                }
            }
        } else if (body instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> params = (Map<String, Object>) body;
            configId = params.get("configId") != null
                    ? Long.valueOf(params.get("configId").toString()) : null;
            mappingType = params.get("mappingType") != null ? params.get("mappingType").toString() : null;
            @SuppressWarnings("unchecked")
            List<ErpDataMapping> list = params.get("mappings") != null
                    ? (List<ErpDataMapping>) params.get("mappings") : java.util.Collections.emptyList();
            mappings = list;
        } else {
            return Result.fail("请求参数格式错误");
        }

        if (configId == null || mappingType == null) {
            return Result.fail("configId和mappingType不能为空");
        }
        boolean success = dataMappingService.batchSave(configId, mappingType, mappings);
        return success ? Result.success() : Result.fail("批量保存失败");
    }
}
