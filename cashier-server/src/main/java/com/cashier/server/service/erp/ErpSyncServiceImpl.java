package com.cashier.server.service.erp;

import com.cashier.server.common.BusinessException;
import com.cashier.server.entity.member.Member;
import com.cashier.server.entity.member.MemberCard;
import com.cashier.server.entity.member.MemberCardRecord;
import com.cashier.server.entity.member.PointRecord;
import com.cashier.server.entity.order.DailyReport;
import com.cashier.server.entity.order.Order;
import com.cashier.server.entity.order.SalesSummary;
import com.cashier.server.entity.product.Product;
import com.cashier.server.entity.product.ProductCategory;
import com.cashier.server.service.member.MemberCardService;
import com.cashier.server.service.member.MemberService;
import com.cashier.server.service.order.OrderService;
import com.cashier.server.service.product.ProductCategoryService;
import com.cashier.server.service.product.ProductService;
import com.cashier.server.service.stock.StockCheckTaskService;
import com.cashier.server.websocket.WebSocketService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class ErpSyncServiceImpl implements ErpSyncService {

    private static final Logger log = LoggerFactory.getLogger(ErpSyncServiceImpl.class);

    @Autowired
    private ErpApiClient erpApiClient;

    @Autowired
    private ProductService productService;

    @Autowired
    private ProductCategoryService productCategoryService;

    @Autowired
    private OrderService orderService;

    @Autowired
    private WebSocketService webSocketService;

    @Autowired
    private MemberService memberService;

    @Autowired
    private MemberCardService memberCardService;

    @Autowired
    @Lazy
    private StockCheckTaskService stockCheckTaskService;

    @Override
    @Scheduled(cron = "0 0/30 * * * ?")
    public void syncProductsFromErp() {
        log.info("开始定时同步商品数据...");
        try {
            List<Map<String, Object>> productList = pullProductsFromErp();
            if (productList != null && !productList.isEmpty()) {
                for (Map<String, Object> productData : productList) {
                    syncOrUpdateProduct(productData);
                }
                log.info("商品数据同步完成, 数量: {}", productList.size());
                webSocketService.broadcastProductUpdate("商品数据已更新");
            } else {
                log.info("未获取到需要同步的商品数据");
            }
        } catch (Exception e) {
            log.error("商品数据同步失败", e);
            throw new BusinessException("商品数据同步失败: " + e.getMessage());
        }
    }

    @Override
    @Scheduled(cron = "0 0/10 * * * ?")
    public void syncStockFromErp() {
        log.info("开始定时同步库存数据...");
        try {
            List<Map<String, Object>> stockList = pullStockFromErp();
            if (stockList != null && !stockList.isEmpty()) {
                for (Map<String, Object> stockData : stockList) {
                    String erpGoodsId = stockData.get("erpGoodsId") != null ? stockData.get("erpGoodsId").toString() : null;
                    Integer stock = stockData.get("stock") != null ? Integer.valueOf(stockData.get("stock").toString()) : 0;
                    updateProductStock(erpGoodsId, stock);
                }
                log.info("库存数据同步完成, 数量: {}", stockList.size());
                webSocketService.broadcastStockUpdate("库存数据已更新");
            } else {
                log.info("未获取到需要同步的库存数据");
            }
        } catch (Exception e) {
            log.error("库存数据同步失败", e);
            throw new BusinessException("库存数据同步失败: " + e.getMessage());
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
                boolean success = pushOrderToErp(order);
                if (success) {
                    orderService.updateSyncStatus(order.getId(), 1, null);
                    successCount++;
                    log.info("订单同步成功: orderId={}, orderNo={}", order.getId(), order.getOrderNo());
                } else {
                    orderService.updateSyncStatus(order.getId(), 2, "ERP接口返回失败");
                    failCount++;
                    log.warn("订单同步失败: orderId={}, orderNo={}, error=ERP接口返回失败", order.getId(), order.getOrderNo());
                }
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
                log.error("订单不存在: orderId={}", orderId);
                return false;
            }
            orderService.incrementSyncAttempts(orderId);
            boolean success = pushOrderToErp(order);
            if (success) {
                orderService.updateSyncStatus(orderId, 1, null);
                webSocketService.broadcastOrderSyncUpdate("订单 " + order.getOrderNo() + " 同步成功");
                log.info("订单同步成功: orderId={}, orderNo={}", orderId, order.getOrderNo());
                return true;
            } else {
                orderService.updateSyncStatus(orderId, 2, "ERP接口返回失败");
                log.warn("订单同步失败: orderId={}, orderNo={}, error=ERP接口返回失败", orderId, order.getOrderNo());
                return false;
            }
        } catch (Exception e) {
            orderService.updateSyncStatus(orderId, 2, e.getMessage());
            log.error("订单同步失败: orderId={}, error={}", orderId, e.getMessage());
            return false;
        }
    }

    @Override
    public List<Map<String, Object>> pullProductsFromErp() {
        log.info("从ERP拉取商品数据...");
        try {
            List<Map<String, Object>> products = erpApiClient.getProducts();
            log.info("从ERP拉取商品数据成功, 数量: {}", products.size());
            return products;
        } catch (Exception e) {
            log.error("从ERP拉取商品数据失败", e);
            throw new BusinessException("从ERP拉取商品数据失败: " + e.getMessage());
        }
    }

    @Override
    public List<Map<String, Object>> pullStockFromErp() {
        log.info("从ERP拉取库存数据...");
        try {
            List<Map<String, Object>> stockList = erpApiClient.getStock();
            log.info("从ERP拉取库存数据成功, 数量: {}", stockList.size());
            return stockList;
        } catch (Exception e) {
            log.error("从ERP拉取库存数据失败", e);
            throw new BusinessException("从ERP拉取库存数据失败: " + e.getMessage());
        }
    }

    @Override
    public boolean pushOrderToErp(Order order) {
        if (order == null) {
            throw new BusinessException("订单不能为空");
        }
        log.info("推送订单到ERP: orderId={}, orderNo={}", order.getId(), order.getOrderNo());
        try {
            Map<String, Object> response = erpApiClient.createOrder(order);
            Integer code = response.get("code") != null ? Integer.valueOf(response.get("code").toString()) : null;
            if (code != null && code == 200) {
                log.info("推送订单到ERP成功: orderId={}, orderNo={}", order.getId(), order.getOrderNo());
                return true;
            } else {
                String message = response.get("message") != null ? response.get("message").toString() : "未知错误";
                log.warn("推送订单到ERP返回失败: orderId={}, code={}, message={}", order.getId(), code, message);
                return false;
            }
        } catch (Exception e) {
            log.error("推送订单到ERP失败: orderId={}, error={}", order.getId(), e.getMessage());
            throw new BusinessException("推送订单到ERP失败: " + e.getMessage());
        }
    }

    @Override
    public boolean pushSalesSummaryToErp(List<SalesSummary> list) {
        if (list == null || list.isEmpty()) {
            log.warn("销售汇总数据为空，跳过推送");
            return true;
        }
        log.info("推送销售汇总到ERP, 数量: {}", list.size());
        try {
            List<Map<String, Object>> summaryList = new ArrayList<>();
            for (SalesSummary summary : list) {
                Map<String, Object> map = new java.util.HashMap<>();
                map.put("erpGoodsId", summary.getErpGoodsId());
                map.put("productName", summary.getProductName());
                map.put("quantity", summary.getQuantity());
                map.put("totalAmount", summary.getTotalAmount());
                map.put("orderDate", summary.getOrderDate());
                summaryList.add(map);
            }
            Map<String, Object> response = erpApiClient.pushSalesSummary(summaryList);
            Integer code = response.get("code") != null ? Integer.valueOf(response.get("code").toString()) : null;
            if (code != null && code == 200) {
                log.info("推送销售汇总到ERP成功, 数量: {}", list.size());
                return true;
            } else {
                String message = response.get("message") != null ? response.get("message").toString() : "未知错误";
                log.warn("推送销售汇总到ERP返回失败, code={}, message={}", code, message);
                return false;
            }
        } catch (Exception e) {
            log.error("推送销售汇总到ERP失败", e);
            throw new BusinessException("推送销售汇总到ERP失败: " + e.getMessage());
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

    @Override
    @Scheduled(cron = "0 0/30 * * * ?")
    public void syncMembersFromErp() {
        log.info("开始定时同步会员数据...");
        try {
            List<Map<String, Object>> memberList = pullMembersFromErp();
            if (memberList != null && !memberList.isEmpty()) {
                for (Map<String, Object> memberData : memberList) {
                    syncOrUpdateMember(memberData);
                }
                log.info("会员数据同步完成, 数量: {}", memberList.size());
                webSocketService.broadcastMemberUpdate("会员数据已更新");
            } else {
                log.info("未获取到需要同步的会员数据");
            }
        } catch (Exception e) {
            log.error("会员数据同步失败", e);
            throw new BusinessException("会员数据同步失败: " + e.getMessage());
        }
    }

    @Override
    public List<Map<String, Object>> pullMembersFromErp() {
        log.info("从ERP拉取会员数据...");
        try {
            List<Map<String, Object>> members = erpApiClient.getMembers();
            log.info("从ERP拉取会员数据成功, 数量: {}", members != null ? members.size() : 0);
            return members;
        } catch (Exception e) {
            log.error("从ERP拉取会员数据失败", e);
            throw new BusinessException("从ERP拉取会员数据失败: " + e.getMessage());
        }
    }

    @Override
    public boolean pushMemberPointsToErp(List<PointRecord> pointRecords) {
        if (pointRecords == null || pointRecords.isEmpty()) {
            log.warn("积分变动记录为空，跳过推送");
            return true;
        }
        log.info("推送积分变动到ERP, 数量: {}", pointRecords.size());
        try {
            Map<String, Object> response = erpApiClient.pushMemberPoints(pointRecords);
            Integer code = response.get("code") != null ? Integer.valueOf(response.get("code").toString()) : null;
            if (code != null && code == 200) {
                log.info("推送积分变动到ERP成功, 数量: {}", pointRecords.size());
                return true;
            } else {
                String message = response.get("message") != null ? response.get("message").toString() : "未知错误";
                log.warn("推送积分变动到ERP返回失败, code={}, message={}", code, message);
                return false;
            }
        } catch (Exception e) {
            log.error("推送积分变动到ERP失败", e);
            throw new BusinessException("推送积分变动到ERP失败: " + e.getMessage());
        }
    }

    @Override
    public boolean pushMemberCardRecordsToErp(List<MemberCardRecord> cardRecords) {
        if (cardRecords == null || cardRecords.isEmpty()) {
            log.warn("会员卡交易记录为空，跳过推送");
            return true;
        }
        log.info("推送会员卡交易记录到ERP, 数量: {}", cardRecords.size());
        try {
            Map<String, Object> response = erpApiClient.pushMemberCardRecords(cardRecords);
            Integer code = response.get("code") != null ? Integer.valueOf(response.get("code").toString()) : null;
            if (code != null && code == 200) {
                log.info("推送会员卡交易记录到ERP成功, 数量: {}", cardRecords.size());
                return true;
            } else {
                String message = response.get("message") != null ? response.get("message").toString() : "未知错误";
                log.warn("推送会员卡交易记录到ERP返回失败, code={}, message={}", code, message);
                return false;
            }
        } catch (Exception e) {
            log.error("推送会员卡交易记录到ERP失败", e);
            throw new BusinessException("推送会员卡交易记录到ERP失败: " + e.getMessage());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean receiveMemberPush(List<Map<String, Object>> memberList) {
        log.info("接收ERP会员推送, 数量: {}", memberList != null ? memberList.size() : 0);
        try {
            if (memberList != null && !memberList.isEmpty()) {
                for (Map<String, Object> memberData : memberList) {
                    syncOrUpdateMember(memberData);
                }
            }
            webSocketService.broadcastMemberUpdate("会员数据已更新");
            return true;
        } catch (Exception e) {
            log.error("会员推送处理失败", e);
            return false;
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean receiveMemberCardPush(List<Map<String, Object>> cardList) {
        log.info("接收ERP会员卡推送, 数量: {}", cardList != null ? cardList.size() : 0);
        try {
            if (cardList != null && !cardList.isEmpty()) {
                for (Map<String, Object> cardData : cardList) {
                    syncOrUpdateMemberCard(cardData);
                }
            }
            webSocketService.broadcastMemberUpdate("会员卡数据已更新");
            return true;
        } catch (Exception e) {
            log.error("会员卡推送处理失败", e);
            return false;
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Member syncOrUpdateMember(Map<String, Object> memberData) {
        String erpMemberId = memberData.get("erpMemberId") != null ? memberData.get("erpMemberId").toString() : null;
        if (erpMemberId == null) {
            return null;
        }

        Member existMember = memberService.lambdaQuery()
                .eq(Member::getErpMemberId, erpMemberId)
                .one();

        Member member = existMember != null ? existMember : new Member();
        member.setErpMemberId(erpMemberId);

        if (memberData.get("phone") != null) {
            member.setPhone(memberData.get("phone").toString());
        }
        if (memberData.get("cardNo") != null) {
            member.setCardNo(memberData.get("cardNo").toString());
        }
        if (memberData.get("memberName") != null) {
            member.setMemberName(memberData.get("memberName").toString());
        }
        if (memberData.get("levelId") != null) {
            member.setLevelId(Long.valueOf(memberData.get("levelId").toString()));
        }
        if (memberData.get("levelName") != null) {
            member.setLevelName(memberData.get("levelName").toString());
        }
        if (memberData.get("discountRate") != null) {
            member.setDiscountRate(new BigDecimal(memberData.get("discountRate").toString()));
        }
        if (memberData.get("points") != null) {
            member.setPoints(Integer.valueOf(memberData.get("points").toString()));
        }
        if (memberData.get("totalPoints") != null) {
            member.setTotalPoints(Integer.valueOf(memberData.get("totalPoints").toString()));
        }
        if (memberData.get("balance") != null) {
            member.setBalance(new BigDecimal(memberData.get("balance").toString()));
        }
        if (memberData.get("status") != null) {
            member.setStatus(Integer.valueOf(memberData.get("status").toString()));
        }
        if (memberData.get("lastUsedTime") != null) {
            member.setLastUsedTime(LocalDateTime.parse(memberData.get("lastUsedTime").toString()));
        }

        if (existMember == null) {
            memberService.save(member);
        } else {
            memberService.updateById(member);
        }

        return member;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MemberCard syncOrUpdateMemberCard(Map<String, Object> cardData) {
        String erpCardId = cardData.get("erpCardId") != null ? cardData.get("erpCardId").toString() : null;
        if (erpCardId == null) {
            return null;
        }

        MemberCard existCard = memberCardService.lambdaQuery()
                .eq(MemberCard::getErpCardId, erpCardId)
                .one();

        MemberCard card = existCard != null ? existCard : new MemberCard();
        card.setErpCardId(erpCardId);

        if (cardData.get("cardNo") != null) {
            card.setCardNo(cardData.get("cardNo").toString());
        }
        if (cardData.get("memberId") != null) {
            card.setMemberId(Long.valueOf(cardData.get("memberId").toString()));
        }
        if (cardData.get("cardType") != null) {
            card.setCardType(Integer.valueOf(cardData.get("cardType").toString()));
        }
        if (cardData.get("cardName") != null) {
            card.setCardName(cardData.get("cardName").toString());
        }
        if (cardData.get("balance") != null) {
            card.setBalance(new BigDecimal(cardData.get("balance").toString()));
        }
        if (cardData.get("reservedBalance") != null) {
            card.setReservedBalance(new BigDecimal(cardData.get("reservedBalance").toString()));
        }
        if (cardData.get("creditLimit") != null) {
            card.setCreditLimit(new BigDecimal(cardData.get("creditLimit").toString()));
        }
        if (cardData.get("status") != null) {
            card.setStatus(Integer.valueOf(cardData.get("status").toString()));
        }

        if (existCard == null) {
            memberCardService.save(card);
        } else {
            memberCardService.updateById(card);
        }

        return card;
    }

    @Override
    public boolean pushDailyReportToErp(DailyReport dailyReport) {
        if (dailyReport == null) {
            throw new BusinessException("营业日报不能为空");
        }
        log.info("推送营业日报到ERP: reportNo={}, reportDate={}", dailyReport.getReportNo(), dailyReport.getReportDate());
        try {
            Map<String, Object> response = erpApiClient.pushDailyReport(dailyReport);
            Integer code = response.get("code") != null ? Integer.valueOf(response.get("code").toString()) : null;
            if (code != null && code == 200) {
                log.info("推送营业日报到ERP成功: reportNo={}", dailyReport.getReportNo());
                return true;
            } else {
                String message = response.get("message") != null ? response.get("message").toString() : "未知错误";
                log.warn("推送营业日报到ERP返回失败: reportNo={}, code={}, message={}", dailyReport.getReportNo(), code, message);
                return false;
            }
        } catch (Exception e) {
            log.error("推送营业日报到ERP失败: reportNo={}, error={}", dailyReport.getReportNo(), e.getMessage());
            throw new BusinessException("推送营业日报到ERP失败: " + e.getMessage());
        }
    }

    @Override
    @Scheduled(cron = "0 0/15 * * * ?")
    public void syncStockCheckTasksFromErp() {
        log.info("开始定时同步盘点任务从ERP...");
        try {
            List<Map<String, Object>> taskList = pullStockCheckTasksFromErp(null);
            if (taskList != null && !taskList.isEmpty()) {
                int syncCount = 0;
                for (Map<String, Object> taskData : taskList) {
                    String erpTaskId = taskData.get("erpTaskId") != null ? taskData.get("erpTaskId").toString() : null;
                    if (erpTaskId != null) {
                        boolean success = stockCheckTaskService.syncOrUpdateTaskFromErp(taskData);
                        if (success) {
                            syncCount++;
                        }
                    }
                }
                log.info("盘点任务同步完成, 数量: {}", syncCount);
            } else {
                log.info("未获取到需要同步的盘点任务");
            }
        } catch (Exception e) {
            log.error("盘点任务同步失败", e);
        }
    }

    @Override
    public List<Map<String, Object>> pullStockCheckTasksFromErp(Long shopId) {
        log.info("从ERP拉取盘点任务列表...");
        try {
            String lastSyncTime = null;
            List<Map<String, Object>> tasks = erpApiClient.getStockCheckTasks(shopId, lastSyncTime);
            log.info("从ERP拉取盘点任务列表成功, 数量: {}", tasks != null ? tasks.size() : 0);
            return tasks;
        } catch (Exception e) {
            log.error("从ERP拉取盘点任务列表失败", e);
            throw new BusinessException("从ERP拉取盘点任务列表失败: " + e.getMessage());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean pullStockCheckTaskFromErp(String erpTaskId) {
        log.info("从ERP拉取盘点任务详情, erpTaskId={}", erpTaskId);
        try {
            Map<String, Object> taskDetail = erpApiClient.getStockCheckTaskDetail(erpTaskId);
            List<Map<String, Object>> items = erpApiClient.getStockCheckItems(erpTaskId);
            
            boolean success = stockCheckTaskService.syncOrUpdateTaskFromErp(taskDetail);
            if (success && items != null && !items.isEmpty()) {
                stockCheckTaskService.syncTaskItemsFromErp(erpTaskId, items);
            }
            
            log.info("从ERP拉取盘点任务详情成功, erpTaskId={}, 商品数={}", erpTaskId, items != null ? items.size() : 0);
            return success;
        } catch (Exception e) {
            log.error("从ERP拉取盘点任务详情失败, erpTaskId={}", erpTaskId, e);
            throw new BusinessException("从ERP拉取盘点任务详情失败: " + e.getMessage());
        }
    }

    @Override
    public boolean pushStockCheckResultToErp(Long taskId) {
        log.info("推送盘点结果到ERP, taskId={}", taskId);
        try {
            Map<String, Object> result = stockCheckTaskService.buildErpCheckResult(taskId);
            if (result == null) {
                log.warn("盘点结果为空, 跳过推送, taskId={}", taskId);
                return false;
            }
            Map<String, Object> response = erpApiClient.pushStockCheckResult(result);
            Integer code = response.get("code") != null ? Integer.valueOf(response.get("code").toString()) : null;
            if (code != null && code == 200) {
                log.info("推送盘点结果到ERP成功, taskId={}", taskId);
                return true;
            } else {
                String message = response.get("message") != null ? response.get("message").toString() : "未知错误";
                log.warn("推送盘点结果到ERP返回失败, taskId={}, code={}, message={}", taskId, code, message);
                return false;
            }
        } catch (Exception e) {
            log.error("推送盘点结果到ERP失败, taskId={}", taskId, e);
            throw new BusinessException("推送盘点结果到ERP失败: " + e.getMessage());
        }
    }

    @Override
    public boolean pushStockCheckDiffToErp(Long diffId) {
        log.info("推送盘点差异到ERP, diffId={}", diffId);
        try {
            Map<String, Object> diffData = stockCheckTaskService.buildErpDiffData(diffId);
            if (diffData == null) {
                log.warn("盘点差异数据为空, 跳过推送, diffId={}", diffId);
                return false;
            }
            Map<String, Object> response = erpApiClient.pushStockCheckDiff(diffData);
            Integer code = response.get("code") != null ? Integer.valueOf(response.get("code").toString()) : null;
            if (code != null && code == 200) {
                log.info("推送盘点差异到ERP成功, diffId={}", diffId);
                return true;
            } else {
                String message = response.get("message") != null ? response.get("message").toString() : "未知错误";
                log.warn("推送盘点差异到ERP返回失败, diffId={}, code={}, message={}", diffId, code, message);
                return false;
            }
        } catch (Exception e) {
            log.error("推送盘点差异到ERP失败, diffId={}", diffId, e);
            throw new BusinessException("推送盘点差异到ERP失败: " + e.getMessage());
        }
    }
}
