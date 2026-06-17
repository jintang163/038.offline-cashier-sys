package com.cashier.server.service.erp;

import com.cashier.server.entity.member.Member;
import com.cashier.server.entity.member.MemberCard;
import com.cashier.server.entity.member.MemberCardRecord;
import com.cashier.server.entity.member.PointRecord;
import com.cashier.server.entity.order.DailyReport;
import com.cashier.server.entity.order.Order;
import com.cashier.server.entity.order.SalesSummary;
import com.cashier.server.entity.product.Product;
import com.cashier.server.entity.product.ProductCategory;

import java.util.List;
import java.util.Map;

public interface ErpSyncService {

    void syncProductsFromErp();

    void syncStockFromErp();

    boolean syncOrdersToErp();

    boolean syncOrderToErp(Long orderId);

    List<Map<String, Object>> pullProductsFromErp();

    List<Map<String, Object>> pullStockFromErp();

    boolean pushOrderToErp(Order order);

    boolean pushSalesSummaryToErp(List<SalesSummary> list);

    boolean receiveProductPush(List<Map<String, Object>> productList);

    boolean receiveCategoryPush(List<Map<String, Object>> categoryList);

    boolean receiveStockPush(List<Map<String, Object>> stockList);

    boolean receiveOrderCallback(Map<String, Object> callbackData);

    Product syncOrUpdateProduct(Map<String, Object> productData);

    ProductCategory syncOrUpdateCategory(Map<String, Object> categoryData);

    boolean updateProductStock(String erpGoodsId, Integer stock);

    void syncMembersFromErp();

    List<Map<String, Object>> pullMembersFromErp();

    boolean pushMemberPointsToErp(List<PointRecord> pointRecords);

    boolean pushMemberCardRecordsToErp(List<MemberCardRecord> cardRecords);

    boolean receiveMemberPush(List<Map<String, Object>> memberList);

    boolean receiveMemberCardPush(List<Map<String, Object>> cardList);

    Member syncOrUpdateMember(Map<String, Object> memberData);

    MemberCard syncOrUpdateMemberCard(Map<String, Object> cardData);

    boolean pushDailyReportToErp(DailyReport dailyReport);

    void syncStockCheckTasksFromErp();

    List<Map<String, Object>> pullStockCheckTasksFromErp(Long shopId);

    boolean pullStockCheckTaskFromErp(String erpTaskId);

    boolean pushStockCheckResultToErp(Long taskId);

    boolean pushStockCheckDiffToErp(Long diffId);

    String pushRedSalesOrder(com.cashier.server.entity.order.RefundOrder refundOrder, List<com.cashier.server.entity.order.RefundOrderItem> items);
}
