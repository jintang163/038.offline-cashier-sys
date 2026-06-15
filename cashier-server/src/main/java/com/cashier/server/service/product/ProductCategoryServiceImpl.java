package com.cashier.server.service.product;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.entity.product.ProductCategory;
import com.cashier.server.mapper.product.ProductCategoryMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductCategoryServiceImpl extends ServiceImpl<ProductCategoryMapper, ProductCategory> implements ProductCategoryService {

    @Override
    public List<ProductCategory> getAllCategories() {
        LambdaQueryWrapper<ProductCategory> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ProductCategory::getStatus, 1);
        wrapper.orderByAsc(ProductCategory::getSort);
        return list(wrapper);
    }

    @Override
    public IPage<ProductCategory> getCategoryPage(Integer page, Integer size) {
        LambdaQueryWrapper<ProductCategory> wrapper = new LambdaQueryWrapper<>();
        wrapper.orderByAsc(ProductCategory::getSort);
        return page(new Page<>(page, size), wrapper);
    }

    @Override
    public boolean addCategory(ProductCategory category) {
        return save(category);
    }

    @Override
    public boolean updateCategory(ProductCategory category) {
        return updateById(category);
    }

    @Override
    public boolean deleteCategory(Long id) {
        return removeById(id);
    }
}
