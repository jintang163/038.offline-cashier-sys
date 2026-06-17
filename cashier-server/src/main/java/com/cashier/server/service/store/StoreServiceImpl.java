package com.cashier.server.service.store;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.common.BusinessException;
import com.cashier.server.entity.store.Store;
import com.cashier.server.mapper.store.StoreMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class StoreServiceImpl extends ServiceImpl<StoreMapper, Store> implements StoreService {

    @Override
    public Store getByStoreCode(String storeCode) {
        return lambdaQuery().eq(Store::getStoreCode, storeCode).one();
    }

    @Override
    public IPage<Store> getStoreList(Integer page, Integer size, String keyword, Integer status, Integer storeType) {
        Page<Store> pageReq = new Page<>(page, size);
        LambdaQueryWrapper<Store> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(Store::getStoreName, keyword)
                    .or().like(Store::getStoreCode, keyword)
                    .or().like(Store::getContactPhone, keyword));
        }
        if (status != null) {
            wrapper.eq(Store::getStatus, status);
        }
        if (storeType != null) {
            wrapper.eq(Store::getStoreType, storeType);
        }
        wrapper.orderByDesc(Store::getCreateTime);
        return page(pageReq, wrapper);
    }

    @Override
    public List<Store> getAllActiveStores() {
        return lambdaQuery().eq(Store::getStatus, 1).list();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Store createStore(Store store) {
        if (getByStoreCode(store.getStoreCode()) != null) {
            throw new BusinessException("门店编码已存在: " + store.getStoreCode());
        }
        save(store);
        return store;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Store updateStore(Store store) {
        Store existing = getById(store.getId());
        if (existing == null) {
            throw new BusinessException("门店不存在");
        }
        if (!existing.getStoreCode().equals(store.getStoreCode())) {
            Store byCode = getByStoreCode(store.getStoreCode());
            if (byCode != null && !byCode.getId().equals(store.getId())) {
                throw new BusinessException("门店编码已存在: " + store.getStoreCode());
            }
        }
        updateById(store);
        return store;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateStoreStatus(Long storeId, Integer status) {
        Store store = getById(storeId);
        if (store == null) {
            throw new BusinessException("门店不存在");
        }
        store.setStatus(status);
        updateById(store);
    }

    @Override
    public Store getHeadquarters() {
        return lambdaQuery().eq(Store::getIsHeadquarters, 1).one();
    }
}
