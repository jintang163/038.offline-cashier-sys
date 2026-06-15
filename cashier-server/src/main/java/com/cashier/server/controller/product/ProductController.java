package com.cashier.server.controller.product;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.Result;
import com.cashier.server.dto.ProductSyncDTO;
import com.cashier.server.entity.product.Product;
import com.cashier.server.entity.product.ProductStock;
import com.cashier.server.service.erp.ErpSyncService;
import com.cashier.server.service.product.ProductService;
import com.cashier.server.service.product.ProductStockService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/product")
public class ProductController {

    @Autowired
    private ProductService productService;

    @Autowired
    private ProductStockService productStockService;

    @Autowired
    private ErpSyncService erpSyncService;

    @GetMapping("/list")
    public Result<IPage<Product>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer status) {
        return Result.success(productService.getProductList(page, size, categoryId, keyword, status));
    }

    @GetMapping("/{id}")
    public Result<Product> detail(@PathVariable Long id) {
        return Result.success(productService.getProductDetail(id));
    }

    @PostMapping
    public Result<Void> add(@RequestBody Product product) {
        productService.save(product);
        return Result.success();
    }

    @PutMapping
    public Result<Void> update(@RequestBody Product product) {
        productService.updateById(product);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        productService.removeById(id);
        return Result.success();
    }

    @PutMapping("/{id}/on-sale")
    public Result<Void> onSale(@PathVariable Long id) {
        productService.onSale(id);
        return Result.success();
    }

    @PutMapping("/{id}/off-sale")
    public Result<Void> offSale(@PathVariable Long id) {
        productService.offSale(id);
        return Result.success();
    }

    @PutMapping("/batch-on-sale")
    public Result<Void> batchOnSale(@RequestBody Long[] ids) {
        productService.batchOnSale(ids);
        return Result.success();
    }

    @PutMapping("/batch-off-sale")
    public Result<Void> batchOffSale(@RequestBody Long[] ids) {
        productService.batchOffSale(ids);
        return Result.success();
    }

    @GetMapping("/{id}/stock")
    public Result<ProductStock> getStock(@PathVariable Long id) {
        return Result.success(productStockService.getStockByProductId(id));
    }

    @PutMapping("/{id}/stock")
    public Result<Void> updateStock(@PathVariable Long id, @RequestParam Integer stock) {
        productService.updateStock(id, stock);
        return Result.success();
    }

    @GetMapping("/sync-all")
    public Result<Void> syncAll() {
        erpSyncService.syncProductsFromErp();
        erpSyncService.syncStockFromErp();
        return Result.success();
    }

    @GetMapping("/sync-list")
    public Result<List<ProductSyncDTO>> getSyncList(
            @RequestParam(required = false) LocalDateTime updateTime,
            @RequestParam(required = false) Integer status) {
        List<ProductSyncDTO> result = productService.getProductSyncList(updateTime, status);
        return Result.success(result);
    }
}
