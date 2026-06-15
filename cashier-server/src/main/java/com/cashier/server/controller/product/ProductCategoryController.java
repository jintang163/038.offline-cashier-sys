package com.cashier.server.controller.product;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.Result;
import com.cashier.server.entity.product.ProductCategory;
import com.cashier.server.service.product.ProductCategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/product-category")
public class ProductCategoryController {

    @Autowired
    private ProductCategoryService productCategoryService;

    @GetMapping("/all")
    public Result<List<ProductCategory>> all() {
        return Result.success(productCategoryService.getAllCategories());
    }

    @GetMapping("/list")
    public Result<IPage<ProductCategory>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        return Result.success(productCategoryService.getCategoryPage(page, size));
    }

    @GetMapping("/{id}")
    public Result<ProductCategory> detail(@PathVariable Long id) {
        return Result.success(productCategoryService.getById(id));
    }

    @PostMapping
    public Result<Void> add(@RequestBody ProductCategory category) {
        productCategoryService.addCategory(category);
        return Result.success();
    }

    @PutMapping
    public Result<Void> update(@RequestBody ProductCategory category) {
        productCategoryService.updateCategory(category);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        productCategoryService.deleteCategory(id);
        return Result.success();
    }
}
