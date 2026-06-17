package com.cashier.server.controller.store;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.Result;
import com.cashier.server.dto.store.StoreErpConfigDTO;
import com.cashier.server.entity.store.Store;
import com.cashier.server.entity.store.StoreErpConfig;
import com.cashier.server.service.store.StoreErpConfigService;
import com.cashier.server.service.store.StoreService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/store")
public class StoreController {

    @Autowired
    private StoreService storeService;

    @Autowired
    private StoreErpConfigService storeErpConfigService;

    @GetMapping("/list")
    public Result<IPage<Store>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) Integer storeType) {
        return Result.success(storeService.getStoreList(page, size, keyword, status, storeType));
    }

    @GetMapping("/all")
    public Result<List<Store>> allActiveStores() {
        return Result.success(storeService.getAllActiveStores());
    }

    @GetMapping("/{id}")
    public Result<Store> detail(@PathVariable Long id) {
        return Result.success(storeService.getById(id));
    }

    @GetMapping("/code/{storeCode}")
    public Result<Store> getByCode(@PathVariable String storeCode) {
        return Result.success(storeService.getByStoreCode(storeCode));
    }

    @PostMapping
    public Result<Store> create(@RequestBody Store store) {
        return Result.success(storeService.createStore(store));
    }

    @PutMapping
    public Result<Store> update(@RequestBody Store store) {
        return Result.success(storeService.updateStore(store));
    }

    @PutMapping("/{id}/status")
    public Result<Void> updateStatus(@PathVariable Long id, @RequestParam Integer status) {
        storeService.updateStoreStatus(id, status);
        return Result.success();
    }

    @GetMapping("/{storeId}/erp-config")
    public Result<StoreErpConfig> getErpConfig(@PathVariable Long storeId) {
        return Result.success(storeErpConfigService.getByStoreId(storeId));
    }

    @PostMapping("/erp-config")
    public Result<StoreErpConfig> saveErpConfig(@RequestBody StoreErpConfigDTO dto) {
        return Result.success(storeErpConfigService.createOrUpdateConfig(dto));
    }

    @DeleteMapping("/{storeId}/erp-config")
    public Result<Void> deleteErpConfig(@PathVariable Long storeId) {
        storeErpConfigService.deleteConfig(storeId);
        return Result.success();
    }

    @GetMapping("/headquarters")
    public Result<Store> getHeadquarters() {
        return Result.success(storeService.getHeadquarters());
    }
}
