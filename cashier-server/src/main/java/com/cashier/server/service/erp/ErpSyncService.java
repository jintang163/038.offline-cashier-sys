package com.cashier.server.service.erp;

import com.cashier.server.entity.product.Product;
import com.cashier.server.entity.product.ProductCategory;

import java.util.List;
import java.util.Map;

public interface ErpSyncService {

    void syncProductsFromErp();

    void syncStockFromErp();

    boolean syncOrdersToErp();

    boolean syncOrderToErp(Long orderId);

    boolean receiveProductPush(List<Map<String, Object>> productList);

    boolean receiveCategoryPush(List<Map<String, Object>> categoryList);

    boolean receiveStockPush(List<Map<String, Object>> stockList);

    boolean receiveOrderCallback(Map<String, Object> callbackData);

    Product syncOrUpdateProduct(Map<String, Object> productData);

    ProductCategory syncOrUpdateCategory(Map<String, Object> categoryData);

    boolean updateProductStock(String erpGoodsId, Integer stock);
}
