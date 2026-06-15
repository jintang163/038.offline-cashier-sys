package com.cashier.server.service.product;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.dto.ProductSyncDTO;
import com.cashier.server.entity.product.Product;
import com.cashier.server.entity.product.ProductStock;
import com.cashier.server.mapper.product.ProductMapper;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProductServiceImpl extends ServiceImpl<ProductMapper, Product> implements ProductService {

    @Autowired
    private ProductStockService productStockService;

    @Override
    public IPage<Product> getProductList(Integer page, Integer size, Long categoryId, String keyword, Integer status) {
        LambdaQueryWrapper<Product> wrapper = new LambdaQueryWrapper<>();
        if (categoryId != null) {
            wrapper.eq(Product::getCategoryId, categoryId);
        }
        if (StringUtils.hasText(keyword)) {
            wrapper.like(Product::getProductName, keyword);
        }
        if (status != null) {
            wrapper.eq(Product::getStatus, status);
        }
        wrapper.orderByDesc(Product::getSort);
        return page(new Page<>(page, size), wrapper);
    }

    @Override
    public Product getProductDetail(Long id) {
        return getById(id);
    }

    @Override
    public boolean onSale(Long id) {
        Product product = new Product();
        product.setId(id);
        product.setStatus(1);
        return updateById(product);
    }

    @Override
    public boolean offSale(Long id) {
        Product product = new Product();
        product.setId(id);
        product.setStatus(0);
        return updateById(product);
    }

    @Override
    public boolean batchOnSale(Long[] ids) {
        List<Long> idList = Arrays.asList(ids);
        return lambdaUpdate()
                .set(Product::getStatus, 1)
                .in(Product::getId, idList)
                .update();
    }

    @Override
    public boolean batchOffSale(Long[] ids) {
        List<Long> idList = Arrays.asList(ids);
        return lambdaUpdate()
                .set(Product::getStatus, 0)
                .in(Product::getId, idList)
                .update();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateStock(Long productId, Integer stock) {
        Product product = getById(productId);
        if (product == null) {
            return false;
        }
        product.setStock(stock);
        updateById(product);

        ProductStock productStock = productStockService.lambdaQuery()
                .eq(ProductStock::getProductId, productId)
                .one();
        if (productStock == null) {
            productStock = new ProductStock();
            productStock.setProductId(productId);
            productStock.setErpGoodsId(product.getErpGoodsId());
            productStock.setStock(stock);
            productStock.setFrozenStock(0);
            productStock.setAvailableStock(stock);
            productStockService.save(productStock);
        } else {
            productStock.setStock(stock);
            productStock.setAvailableStock(stock - productStock.getFrozenStock());
            productStockService.updateById(productStock);
        }
        return true;
    }

    @Override
    public List<ProductSyncDTO> getProductSyncList(LocalDateTime updateTime, Integer status) {
        LambdaQueryWrapper<Product> wrapper = new LambdaQueryWrapper<>();
        if (updateTime != null) {
            wrapper.ge(Product::getUpdateTime, updateTime);
        }
        if (status != null) {
            wrapper.eq(Product::getStatus, status);
        }
        wrapper.orderByAsc(Product::getSort);
        List<Product> products = list(wrapper);
        return products.stream().map(this::convertToSyncDTO).collect(Collectors.toList());
    }

    private ProductSyncDTO convertToSyncDTO(Product product) {
        ProductSyncDTO dto = new ProductSyncDTO();
        BeanUtils.copyProperties(product, dto);
        return dto;
    }
}
