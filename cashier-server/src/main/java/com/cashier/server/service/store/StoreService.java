package com.cashier.server.service.store;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.store.Store;

import java.util.List;

public interface StoreService extends IService<Store> {

    Store getByStoreCode(String storeCode);

    IPage<Store> getStoreList(Integer page, Integer size, String keyword, Integer status, Integer storeType);

    List<Store> getAllActiveStores();

    Store createStore(Store store);

    Store updateStore(Store store);

    void updateStoreStatus(Long storeId, Integer status);

    Store getHeadquarters();
}
