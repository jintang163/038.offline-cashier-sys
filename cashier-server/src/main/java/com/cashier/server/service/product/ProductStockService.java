package com.cashier.server.service.product;

import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.product.ProductStock;

public interface ProductStockService extends IService<ProductStock> {

    ProductStock getStockByProductId(Long productId);

    ProductStock getStockByErpGoodsId(String erpGoodsId);

    boolean deductStock(Long productId, Integer quantity);

    boolean addStock(Long productId, Integer quantity);

    boolean freezeStock(Long productId, Integer quantity);

    boolean unfreezeStock(Long productId, Integer quantity);
}
