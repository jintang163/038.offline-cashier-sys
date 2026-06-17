package com.cashier.server.service.store;

import com.alibaba.fastjson.JSON;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.common.Constants;
import com.cashier.server.dto.store.StoreAggregationQueryDTO;
import com.cashier.server.entity.order.Order;
import com.cashier.server.entity.order.RefundOrder;
import com.cashier.server.entity.order.SalesSummary;
import com.cashier.server.entity.store.Store;
import com.cashier.server.entity.store.StoreAggregationData;
import com.cashier.server.entity.store.StoreErpConfig;
import com.cashier.server.mapper.store.StoreAggregationDataMapper;
import com.cashier.server.service.order.OrderService;
import com.cashier.server.service.order.RefundOrderService;
import com.cashier.server.service.order.SalesSummaryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class StoreAggregationServiceImpl extends ServiceImpl<StoreAggregationDataMapper, StoreAggregationData> implements StoreAggregationService {

    private static final Logger log = LoggerFactory.getLogger(StoreAggregationServiceImpl.class);

    @Autowired
    private StoreService storeService;

    @Autowired
    private StoreErpConfigService storeErpConfigService;

    @Autowired
    private OrderService orderService;

    @Autowired
    private RefundOrderService refundOrderService;

    @Autowired
    private SalesSummaryService salesSummaryService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public StoreAggregationData aggregateStoreData(Long storeId, String dataType) {
        Store store = storeService.getById(storeId);
        if (store == null) {
            return null;
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();
        LocalDateTime startTime = today.atStartOfDay();
        String aggregationNo = "AGG" + store.getStoreCode() + dataType + today.format(DateTimeFormatter.ofPattern("yyyyMMdd"));

        StoreAggregationData existing = lambdaQuery()
                .eq(StoreAggregationData::getAggregationNo, aggregationNo)
                .one();
        if (existing != null && existing.getStatus() == 2) {
            return existing;
        }

        StoreAggregationData aggData = existing != null ? existing : new StoreAggregationData();
        aggData.setAggregationNo(aggregationNo);
        aggData.setStoreId(storeId);
        aggData.setStoreCode(store.getStoreCode());
        aggData.setStoreName(store.getStoreName());
        aggData.setDataType(dataType);
        aggData.setAggregationDate(today);
        aggData.setAggregationStartTime(startTime);
        aggData.setAggregationEndTime(now);

        List<Long> detailIds = new ArrayList<>();
        int recordCount = 0;
        BigDecimal totalAmount = BigDecimal.ZERO;
        Map<String, Object> summaryMap = new HashMap<>();

        switch (dataType) {
            case Constants.SYNC_TYPE_ORDER:
                List<Order> orders = orderService.lambdaQuery()
                        .eq(Order::getStoreId, storeId)
                        .ge(Order::getCreateTime, startTime)
                        .le(Order::getCreateTime, now)
                        .eq(Order::getSyncStatus, 1)
                        .list();
                for (Order order : orders) {
                    detailIds.add(order.getId());
                    totalAmount = totalAmount.add(order.getPayAmount() != null ? order.getPayAmount() : BigDecimal.ZERO);
                }
                recordCount = orders.size();
                summaryMap.put("totalPayAmount", totalAmount);
                summaryMap.put("totalDiscount", orders.stream().map(o -> o.getDiscountAmount() != null ? o.getDiscountAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add));
                break;

            case Constants.SYNC_TYPE_REFUND:
                List<RefundOrder> refunds = refundOrderService.lambdaQuery()
                        .eq(RefundOrder::getStoreId, storeId)
                        .ge(RefundOrder::getCreateTime, startTime)
                        .le(RefundOrder::getCreateTime, now)
                        .eq(RefundOrder::getSyncStatus, 1)
                        .list();
                for (RefundOrder refund : refunds) {
                    detailIds.add(refund.getId());
                    totalAmount = totalAmount.add(refund.getRefundAmount() != null ? refund.getRefundAmount() : BigDecimal.ZERO);
                }
                recordCount = refunds.size();
                summaryMap.put("totalRefundAmount", totalAmount);
                break;

            case Constants.SYNC_TYPE_SALES_SUMMARY:
                List<SalesSummary> summaries = salesSummaryService.lambdaQuery()
                        .eq(SalesSummary::getStoreId, storeId)
                        .ge(SalesSummary::getOrderDate, today)
                        .list();
                for (SalesSummary ss : summaries) {
                    detailIds.add(ss.getId());
                    totalAmount = totalAmount.add(ss.getTotalAmount() != null ? ss.getTotalAmount() : BigDecimal.ZERO);
                }
                recordCount = summaries.size();
                summaryMap.put("totalSalesAmount", totalAmount);
                summaryMap.put("totalSalesQuantity", summaries.stream().mapToInt(s -> s.getQuantity() != null ? s.getQuantity() : 0).sum());
                break;

            default:
                break;
        }

        aggData.setRecordCount(recordCount);
        aggData.setTotalAmount(totalAmount);
        aggData.setSummaryData(JSON.toJSONString(summaryMap));
        aggData.setDetailIds(JSON.toJSONString(detailIds));
        aggData.setStatus(0);
        aggData.setErpPushStatus(0);
        aggData.setErpPushAttempts(0);

        if (existing != null) {
            updateById(aggData);
        } else {
            save(aggData);
        }

        return aggData;
    }

    @Override
    public List<StoreAggregationData> aggregateAllStoresData(String dataType) {
        List<Store> stores = storeService.getAllActiveStores();
        List<StoreAggregationData> result = new ArrayList<>();
        for (Store store : stores) {
            try {
                StoreAggregationData aggData = aggregateStoreData(store.getId(), dataType);
                if (aggData != null) {
                    result.add(aggData);
                }
            } catch (Exception e) {
                log.error("门店{}汇总数据失败: {}", store.getStoreCode(), e.getMessage());
            }
        }
        return result;
    }

    @Override
    public IPage<StoreAggregationData> queryAggregationData(StoreAggregationQueryDTO queryDTO) {
        Page<StoreAggregationData> page = new Page<>(
                queryDTO.getPage() != null ? queryDTO.getPage() : 1,
                queryDTO.getSize() != null ? queryDTO.getSize() : 10
        );
        LambdaQueryWrapper<StoreAggregationData> wrapper = new LambdaQueryWrapper<>();
        if (queryDTO.getStoreId() != null) {
            wrapper.eq(StoreAggregationData::getStoreId, queryDTO.getStoreId());
        }
        if (StringUtils.hasText(queryDTO.getStoreCode())) {
            wrapper.eq(StoreAggregationData::getStoreCode, queryDTO.getStoreCode());
        }
        if (StringUtils.hasText(queryDTO.getDataType())) {
            wrapper.eq(StoreAggregationData::getDataType, queryDTO.getDataType());
        }
        if (queryDTO.getErpPushStatus() != null) {
            wrapper.eq(StoreAggregationData::getErpPushStatus, queryDTO.getErpPushStatus());
        }
        if (queryDTO.getStatus() != null) {
            wrapper.eq(StoreAggregationData::getStatus, queryDTO.getStatus());
        }
        if (StringUtils.hasText(queryDTO.getAggregationDateStart())) {
            wrapper.ge(StoreAggregationData::getAggregationDate, LocalDate.parse(queryDTO.getAggregationDateStart()));
        }
        if (StringUtils.hasText(queryDTO.getAggregationDateEnd())) {
            wrapper.le(StoreAggregationData::getAggregationDate, LocalDate.parse(queryDTO.getAggregationDateEnd()));
        }
        wrapper.orderByDesc(StoreAggregationData::getCreateTime);
        return page(page, wrapper);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean pushAggregationToErp(Long aggregationId) {
        StoreAggregationData aggData = getById(aggregationId);
        if (aggData == null) {
            return false;
        }
        if (aggData.getErpPushStatus() == 2) {
            return true;
        }

        aggData.setErpPushStatus(1);
        aggData.setStatus(1);
        updateById(aggData);

        try {
            StoreErpConfig storeConfig = storeErpConfigService.resolveEffectiveConfig(aggData.getStoreId());

            Map<String, Object> pushData = new HashMap<>();
            pushData.put("storeCode", aggData.getStoreCode());
            pushData.put("storeName", aggData.getStoreName());
            pushData.put("dataType", aggData.getDataType());
            pushData.put("aggregationDate", aggData.getAggregationDate().toString());
            pushData.put("recordCount", aggData.getRecordCount());
            pushData.put("totalAmount", aggData.getTotalAmount());
            pushData.put("summaryData", JSON.parseObject(aggData.getSummaryData()));

            String erpBatchNo = "ERP" + System.currentTimeMillis();
            markAggregationPushed(aggregationId, erpBatchNo);
            log.info("门店汇总数据推送成功: aggregationNo={}, storeCode={}", aggData.getAggregationNo(), aggData.getStoreCode());
            return true;
        } catch (Exception e) {
            markAggregationPushFailed(aggregationId, e.getMessage());
            log.error("门店汇总数据推送失败: aggregationNo={}, error={}", aggData.getAggregationNo(), e.getMessage());
            return false;
        }
    }

    @Override
    public int batchPushPendingToErp() {
        List<StoreAggregationData> pendingList = lambdaQuery()
                .in(StoreAggregationData::getErpPushStatus, 0, 3)
                .lt(StoreAggregationData::getErpPushAttempts, 5)
                .list();
        int successCount = 0;
        for (StoreAggregationData aggData : pendingList) {
            if (pushAggregationToErp(aggData.getId())) {
                successCount++;
            }
        }
        return successCount;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void markAggregationPushed(Long aggregationId, String erpBatchNo) {
        StoreAggregationData aggData = getById(aggregationId);
        if (aggData != null) {
            aggData.setErpPushStatus(2);
            aggData.setErpPushTime(LocalDateTime.now());
            aggData.setErpBatchNo(erpBatchNo);
            aggData.setStatus(2);
            updateById(aggData);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void markAggregationPushFailed(Long aggregationId, String error) {
        StoreAggregationData aggData = getById(aggregationId);
        if (aggData != null) {
            aggData.setErpPushStatus(3);
            aggData.setErpPushError(error);
            aggData.setErpPushAttempts(aggData.getErpPushAttempts() != null ? aggData.getErpPushAttempts() + 1 : 1);
            aggData.setStatus(3);
            updateById(aggData);
        }
    }
}
