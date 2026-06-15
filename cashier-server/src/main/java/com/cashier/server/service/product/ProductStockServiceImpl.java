package com.cashier.server.service.product;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.entity.product.ProductStock;
import com.cashier.server.mapper.product.ProductStockMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductStockServiceImpl extends ServiceImpl<ProductStockMapper, ProductStock> implements ProductStockService {

    @Override
    public ProductStock getStockByProductId(Long productId) {
        return lambdaQuery()
                .eq(ProductStock::getProductId, productId)
                .one();
    }

    @Override
    public ProductStock getStockByErpGoodsId(String erpGoodsId) {
        return lambdaQuery()
                .eq(ProductStock::getErpGoodsId, erpGoodsId)
                .one();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean deductStock(Long productId, Integer quantity) {
        ProductStock stock = getStockByProductId(productId);
        if (stock == null || stock.getAvailableStock() < quantity) {
            return false;
        }
        stock.setStock(stock.getStock() - quantity);
        stock.setAvailableStock(stock.getAvailableStock() - quantity);
        return updateById(stock);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean addStock(Long productId, Integer quantity) {
        ProductStock stock = getStockByProductId(productId);
        if (stock == null) {
            return false;
        }
        stock.setStock(stock.getStock() + quantity);
        stock.setAvailableStock(stock.getAvailableStock() + quantity);
        return updateById(stock);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean freezeStock(Long productId, Integer quantity) {
        ProductStock stock = getStockByProductId(productId);
        if (stock == null || stock.getAvailableStock() < quantity) {
            return false;
        }
        stock.setFrozenStock(stock.getFrozenStock() + quantity);
        stock.setAvailableStock(stock.getStock() - stock.getFrozenStock());
        return updateById(stock);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean unfreezeStock(Long productId, Integer quantity) {
        ProductStock stock = getStockByProductId(productId);
        if (stock == null || stock.getFrozenStock() < quantity) {
            return false;
        }
        stock.setFrozenStock(stock.getFrozenStock() - quantity);
        stock.setAvailableStock(stock.getStock() - stock.getFrozenStock());
        return updateById(stock);
    }
}
