package com.cashier.server.service.product;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.dto.ProductSyncDTO;
import com.cashier.server.entity.product.Product;

import java.time.LocalDateTime;
import java.util.List;

public interface ProductService extends IService<Product> {

    IPage<Product> getProductList(Integer page, Integer size, Long categoryId, String keyword, Integer status);

    Product getProductDetail(Long id);

    boolean onSale(Long id);

    boolean offSale(Long id);

    boolean batchOnSale(Long[] ids);

    boolean batchOffSale(Long[] ids);

    boolean updateStock(Long productId, Integer stock);

    List<ProductSyncDTO> getProductSyncList(LocalDateTime updateTime, Integer status);
}
