package com.cashier.server.service.product;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.entity.product.ProductCategory;

import java.util.List;

public interface ProductCategoryService extends IService<ProductCategory> {

    List<ProductCategory> getAllCategories();

    IPage<ProductCategory> getCategoryPage(Integer page, Integer size);

    boolean addCategory(ProductCategory category);

    boolean updateCategory(ProductCategory category);

    boolean deleteCategory(Long id);
}
