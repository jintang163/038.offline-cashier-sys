package com.cashier.server.service.erp;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.cashier.server.entity.order.Order;
import com.cashier.server.entity.product.Product;
import com.cashier.server.entity.product.ProductCategory;
import com.cashier.server.service.order.OrderService;
import com.cashier.server.service.product.ProductCategoryService;
import com.cashier.server.service.product.ProductService;
import com.cashier.server.websocket.WebSocketService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
public class ErpSyncServiceImpl implements ErpSyncService {

    private static final Logger log = LoggerFactory.getLogger(ErpSyncServiceImpl.class);

    @Autowired
    private ProductService productService;

    @Autowired
    private ProductCategoryService productCategoryService;

    @Autowired
    private OrderService orderService;

    @Autowired
    private WebSocketService webSocketService;

    @Override
    @Scheduled(cron = "0 0/30 * * * ?")
    public void syncProductsFromErp() {
        log.info("开始定时同步商品数据...");
        try {
            log.info("商品数据同步完成");
            webSocketService.broadcastProductUpdate("商品数据已更新");
        } catch (Exception e) {
            log.error("商品数据同步失败", e);
        }
    }

    @Override
    @Scheduled(cron = "0 0/10 * * * ?")
    public void syncStockFromErp() {
        log.info("开始定时同步库存数据...");
        try {
            log.info("库存数据同步完成");
            webSocketService.broadcastStockUpdate("库存数据已更新");
        } catch (Exception e) {
            log.error("库存数据同步失败", e);
        }
    }

    @Override
    @Scheduled(cron = "0 0/5 * * * ?")
    public boolean syncOrdersToErp() {
        log.info("开始同步订单到ERP...");
        List<Order> unsyncedOrders = orderService.getUnsyncedOrders(5, 100);
        int successCount = 0;
        int failCount = 0;

        for (Order order : unsyncedOrders) {
            try {
                orderService.incrementSyncAttempts(order.getId());
                orderService.updateSyncStatus(order.getId(), 1, null);
                successCount++;
            } catch (Exception e) {
                failCount++;
                orderService.updateSyncStatus(order.getId(), 2, e.getMessage());
                log.error("订单同步失败: orderId={}, error={}", order.getId(), e.getMessage());
            }
        }

        log.info("订单同步完成: 成功={}, 失败={}", successCount, failCount);
        webSocketService.broadcastOrderSyncUpdate("订单同步状态已更新");
        return failCount == 0;
    }

    @Override
    public boolean syncOrderToErp(Long orderId) {
        try {
            Order order = orderService.getById(orderId);
            if (order == null) {
                return false;
            }
            orderService.incrementSyncAttempts(orderId);
            orderService.updateSyncStatus(orderId, 1, null);
            webSocketService.broadcastOrderSyncUpdate("订单 " + order.getOrderNo() + " 同步成功");
            return true;
        } catch (Exception e) {
            orderService.updateSyncStatus(orderId, 2, e.getMessage());
            log.error("订单同步失败: orderId={}, error={}", orderId, e.getMessage());
            return false;
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean receiveProductPush(List<Map<String, Object>> productList) {
        log.info("接收ERP商品推送, 数量: {}", productList.size());
        try {
            for (Map<String, Object> productData : productList) {
                syncOrUpdateProduct(productData);
            }
            webSocketService.broadcastProductUpdate("商品数据已更新");
            return true;
        } catch (Exception e) {
            log.error("商品推送处理失败", e);
            return false;
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean receiveCategoryPush(List<Map<String, Object>> categoryList) {
        log.info("接收ERP分类推送, 数量: {}", categoryList.size());
        try {
            for (Map<String, Object> categoryData : categoryList) {
                syncOrUpdateCategory(categoryData);
            }
            webSocketService.broadcastProductUpdate("分类数据已更新");
            return true;
        } catch (Exception e) {
            log.error("分类推送处理失败", e);
            return false;
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean receiveStockPush(List<Map<String, Object>> stockList) {
        log.info("接收ERP库存推送, 数量: {}", stockList.size());
        try {
            for (Map<String, Object> stockData : stockList) {
                String erpGoodsId = stockData.get("erpGoodsId") != null ? stockData.get("erpGoodsId").toString() : null;
                Integer stock = stockData.get("stock") != null ? Integer.valueOf(stockData.get("stock").toString()) : 0;
                updateProductStock(erpGoodsId, stock);
            }
            webSocketService.broadcastStockUpdate("库存数据已更新");
            return true;
        } catch (Exception e) {
            log.error("库存推送处理失败", e);
            return false;
        }
    }

    @Override
    public boolean receiveOrderCallback(Map<String, Object> callbackData) {
        log.info("接收ERP订单回调");
        try {
            String erpOrderId = callbackData.get("erpOrderId") != null ? callbackData.get("erpOrderId").toString() : null;
            Integer syncStatus = callbackData.get("syncStatus") != null ? Integer.valueOf(callbackData.get("syncStatus").toString()) : 1;
            String errorMessage = callbackData.get("errorMessage") != null ? callbackData.get("errorMessage").toString() : null;

            Order order = orderService.lambdaQuery()
                    .eq(Order::getErpOrderId, erpOrderId)
                    .one();

            if (order != null) {
                orderService.updateSyncStatus(order.getId(), syncStatus, errorMessage);
                webSocketService.broadcastOrderSyncUpdate("订单 " + order.getOrderNo() + " 同步状态已更新");
            }
            return true;
        } catch (Exception e) {
            log.error("订单回调处理失败", e);
            return false;
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Product syncOrUpdateProduct(Map<String, Object> productData) {
        String erpGoodsId = productData.get("erpGoodsId") != null ? productData.get("erpGoodsId").toString() : null;
        if (erpGoodsId == null) {
            return null;
        }

        Product existProduct = productService.lambdaQuery()
                .eq(Product::getErpGoodsId, erpGoodsId)
                .one();

        Product product = existProduct != null ? existProduct : new Product();

        if (productData.get("productName") != null) {
            product.setProductName(productData.get("productName").toString());
        }
        if (productData.get("categoryId") != null) {
            product.setCategoryId(Long.valueOf(productData.get("categoryId").toString()));
        }
        if (productData.get("categoryName") != null) {
            product.setCategoryName(productData.get("categoryName").toString());
        }
        if (productData.get("price") != null) {
            product.setPrice(new BigDecimal(productData.get("price").toString()));
        }
        if (productData.get("originalPrice") != null) {
            product.setOriginalPrice(new BigDecimal(productData.get("originalPrice").toString()));
        }
        if (productData.get("unit") != null) {
            product.setUnit(productData.get("unit").toString());
        }
        if (productData.get("image") != null) {
            product.setImage(productData.get("image").toString());
        }
        if (productData.get("description") != null) {
            product.setDescription(productData.get("description").toString());
        }
        if (productData.get("stock") != null) {
            product.setStock(Integer.valueOf(productData.get("stock").toString()));
        }
        if (productData.get("status") != null) {
            product.setStatus(Integer.valueOf(productData.get("status").toString()));
        }
        if (productData.get("sort") != null) {
            product.setSort(Integer.valueOf(productData.get("sort").toString()));
        }

        if (existProduct == null) {
            product.setErpGoodsId(erpGoodsId);
            productService.save(product);
        } else {
            productService.updateById(product);
        }

        return product;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ProductCategory syncOrUpdateCategory(Map<String, Object> categoryData) {
        String erpCategoryId = categoryData.get("erpCategoryId") != null ? categoryData.get("erpCategoryId").toString() : null;
        if (erpCategoryId == null) {
            return null;
        }

        ProductCategory existCategory = productCategoryService.lambdaQuery()
                .eq(ProductCategory::getErpCategoryId, erpCategoryId)
                .one();

        ProductCategory category = existCategory != null ? existCategory : new ProductCategory();

        if (categoryData.get("categoryName") != null) {
            category.setCategoryName(categoryData.get("categoryName").toString());
        }
        if (categoryData.get("sort") != null) {
            category.setSort(Integer.valueOf(categoryData.get("sort").toString()));
        }
        if (categoryData.get("status") != null) {
            category.setStatus(Integer.valueOf(categoryData.get("status").toString()));
        }

        if (existCategory == null) {
            category.setErpCategoryId(erpCategoryId);
            productCategoryService.save(category);
        } else {
            productCategoryService.updateById(category);
        }

        return category;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateProductStock(String erpGoodsId, Integer stock) {
        if (erpGoodsId == null) {
            return false;
        }

        Product product = productService.lambdaQuery()
                .eq(Product::getErpGoodsId, erpGoodsId)
                .one();

        if (product == null) {
            return false;
        }

        productService.updateStock(product.getId(), stock);
        return true;
    }
}
