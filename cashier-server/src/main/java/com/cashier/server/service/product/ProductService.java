package com.cashier.server.service.product;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.product.Product;

public interface ProductService extends IService<Product> {

    IPage<Product> getProductList(Integer page, Integer size, Long categoryId, String keyword, Integer status);

    Product getProductDetail(Long id);

    boolean onSale(Long id);

    boolean offSale(Long id);

    boolean batchOnSale(Long[] ids);

    boolean batchOffSale(Long[] ids);

    boolean updateStock(Long productId, Integer stock);
}
