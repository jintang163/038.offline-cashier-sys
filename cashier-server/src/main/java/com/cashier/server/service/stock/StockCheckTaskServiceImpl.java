package com.cashier.server.service.stock;

import cn.hutool.core.util.StrUtil;
import com.alibaba.fastjson.JSON;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.common.BusinessException;
import com.cashier.server.dto.stock.StockCheckItemDTO;
import com.cashier.server.dto.stock.StockCheckRecordDTO;
import com.cashier.server.dto.stock.StockCheckTaskDTO;
import com.cashier.server.dto.stock.StockCheckUploadDTO;
import com.cashier.server.entity.product.Product;
import com.cashier.server.entity.product.ProductStock;
import com.cashier.server.entity.stock.StockCheckDiff;
import com.cashier.server.entity.stock.StockCheckItem;
import com.cashier.server.entity.stock.StockCheckRecord;
import com.cashier.server.entity.stock.StockCheckTask;
import com.cashier.server.mapper.stock.StockCheckDiffMapper;
import com.cashier.server.mapper.stock.StockCheckItemMapper;
import com.cashier.server.mapper.stock.StockCheckRecordMapper;
import com.cashier.server.mapper.stock.StockCheckTaskMapper;
import com.cashier.server.service.erp.ErpApiClient;
import com.cashier.server.service.product.ProductService;
import com.cashier.server.service.product.ProductStockService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
public class StockCheckTaskServiceImpl extends ServiceImpl<StockCheckTaskMapper, StockCheckTask> implements StockCheckTaskService {

    @Autowired
    private StockCheckItemMapper stockCheckItemMapper;

    @Autowired
    private StockCheckRecordMapper stockCheckRecordMapper;

    @Autowired
    private StockCheckDiffMapper stockCheckDiffMapper;

    @Autowired
    private ProductService productService;

    @Autowired
    private ProductStockService productStockService;

    @Autowired
    private ErpApiClient erpApiClient;

    private static final int TASK_STATUS_DRAFT = 0;
    private static final int TASK_STATUS_PUBLISHED = 1;
    private static final int TASK_STATUS_IN_PROGRESS = 2;
    private static final int TASK_STATUS_FINISHED = 3;
    private static final int TASK_STATUS_CANCELLED = 4;

    private static final int CHECK_MODE_FULL = 1;
    private static final int CHECK_MODE_SPOT = 2;

    private static final int DIFF_TYPE_OVERAGE = 1;
    private static final int DIFF_TYPE_LOSS = 2;

    private static final int HANDLE_TYPE_LOSS_REPORT = 1;
    private static final int HANDLE_TYPE_STOCK_ADJUST = 2;

    private static final int HANDLE_STATUS_PENDING = 0;
    private static final int HANDLE_STATUS_PROCESSED = 1;
    private static final int HANDLE_STATUS_SYNCED = 2;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public StockCheckTask createTask(StockCheckTaskDTO dto) {
        log.info("创建盘点任务，taskName={}, taskType={}", dto.getTaskName(), dto.getTaskType());

        String taskNo = generateTaskNo();
        StockCheckTask task = new StockCheckTask();
        BeanUtils.copyProperties(dto, task);
        task.setTaskNo(taskNo);
        task.setTaskStatus(TASK_STATUS_DRAFT);
        task.setSyncStatus(0);
        save(task);

        if (dto.getProductIds() != null && !dto.getProductIds().isEmpty()) {
            createTaskItems(task.getId(), taskNo, dto.getProductIds());
        } else if (CHECK_MODE_FULL.equals(dto.getCheckMode())) {
            List<Long> allProductIds = productService.lambdaQuery()
                    .eq(Product::getStatus, 1)
                    .list()
                    .stream()
                    .map(Product::getId)
                    .collect(Collectors.toList());
            createTaskItems(task.getId(), taskNo, allProductIds);
        } else if (dto.getCategoryId() != null) {
            List<Long> categoryProductIds = productService.lambdaQuery()
                    .eq(Product::getCategoryId, dto.getCategoryId())
                    .eq(Product::getStatus, 1)
                    .list()
                    .stream()
                    .map(Product::getId)
                    .collect(Collectors.toList());
            createTaskItems(task.getId(), taskNo, categoryProductIds);
        }

        log.info("盘点任务创建成功，taskId={}, taskNo={}", task.getId(), taskNo);
        return task;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateTask(StockCheckTaskDTO dto) {
        log.info("更新盘点任务，taskId={}", dto.getId());

        StockCheckTask task = getById(dto.getId());
        if (task == null) {
            throw new BusinessException("盘点任务不存在");
        }

        if (task.getTaskStatus() != TASK_STATUS_DRAFT) {
            throw new BusinessException("只能修改草稿状态的任务");
        }

        BeanUtils.copyProperties(dto, task);
        boolean result = updateById(task);

        if (dto.getProductIds() != null && !dto.getProductIds().isEmpty()) {
            stockCheckItemMapper.delete(new LambdaQueryWrapper<StockCheckItem>()
                    .eq(StockCheckItem::getTaskId, dto.getId()));
            createTaskItems(dto.getId(), task.getTaskNo(), dto.getProductIds());
        }

        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean deleteTask(Long id) {
        log.info("删除盘点任务，taskId={}", id);

        StockCheckTask task = getById(id);
        if (task == null) {
            throw new BusinessException("盘点任务不存在");
        }

        if (task.getTaskStatus() != TASK_STATUS_DRAFT) {
            throw new BusinessException("只能删除草稿状态的任务");
        }

        stockCheckItemMapper.delete(new LambdaQueryWrapper<StockCheckItem>()
                .eq(StockCheckItem::getTaskId, id));
        return removeById(id);
    }

    @Override
    public IPage<StockCheckTask> getTaskPage(Integer page, Integer size, Integer taskType, Integer checkMode, Integer taskStatus, String keyword) {
        LambdaQueryWrapper<StockCheckTask> wrapper = new LambdaQueryWrapper<>();
        if (taskType != null) {
            wrapper.eq(StockCheckTask::getTaskType, taskType);
        }
        if (checkMode != null) {
            wrapper.eq(StockCheckTask::getCheckMode, checkMode);
        }
        if (taskStatus != null) {
            wrapper.eq(StockCheckTask::getTaskStatus, taskStatus);
        }
        if (StrUtil.isNotBlank(keyword)) {
            wrapper.and(w -> w.like(StockCheckTask::getTaskNo, keyword)
                    .or().like(StockCheckTask::getTaskName, keyword));
        }
        wrapper.orderByDesc(StockCheckTask::getCreateTime);
        return page(new Page<>(page, size), wrapper);
    }

    @Override
    public StockCheckTaskDTO getTaskDetail(Long id) {
        StockCheckTask task = getById(id);
        if (task == null) {
            throw new BusinessException("盘点任务不存在");
        }

        StockCheckTaskDTO dto = new StockCheckTaskDTO();
        BeanUtils.copyProperties(task, dto);

        List<StockCheckItem> items = stockCheckItemMapper.selectList(
                new LambdaQueryWrapper<StockCheckItem>().eq(StockCheckItem::getTaskId, id));
        List<StockCheckItemDTO> itemDTOs = items.stream().map(item -> {
            StockCheckItemDTO itemDTO = new StockCheckItemDTO();
            BeanUtils.copyProperties(item, itemDTO);
            return itemDTO;
        }).collect(Collectors.toList());
        dto.setItems(itemDTOs);

        return dto;
    }

    @Override
    public List<StockCheckTask> getDownloadableTasks(Long shopId, LocalDateTime lastSyncTime) {
        LambdaQueryWrapper<StockCheckTask> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(StockCheckTask::getTaskStatus, TASK_STATUS_PUBLISHED)
                .or().eq(StockCheckTask::getTaskStatus, TASK_STATUS_IN_PROGRESS);

        if (shopId != null) {
            wrapper.and(w -> w.eq(StockCheckTask::getShopId, shopId).or().isNull(StockCheckTask::getShopId));
        }

        if (lastSyncTime != null) {
            wrapper.gt(StockCheckTask::getUpdateTime, lastSyncTime);
        }

        wrapper.orderByDesc(StockCheckTask::getCreateTime);
        return list(wrapper);
    }

    @Override
    public StockCheckTaskDTO getTaskWithItems(Long id) {
        StockCheckTask task = getById(id);
        if (task == null) {
            throw new BusinessException("盘点任务不存在");
        }

        if (task.getTaskStatus() == TASK_STATUS_DRAFT) {
            throw new BusinessException("任务尚未发布，无法下载");
        }

        StockCheckTaskDTO dto = new StockCheckTaskDTO();
        BeanUtils.copyProperties(task, dto);

        List<StockCheckItem> items = stockCheckItemMapper.selectList(
                new LambdaQueryWrapper<StockCheckItem>().eq(StockCheckItem::getTaskId, id));
        List<StockCheckItemDTO> itemDTOs = items.stream().map(item -> {
            StockCheckItemDTO itemDTO = new StockCheckItemDTO();
            BeanUtils.copyProperties(item, itemDTO);
            return itemDTO;
        }).collect(Collectors.toList());
        dto.setItems(itemDTOs);

        return dto;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean startTask(Long id, Long operatorId, String operatorName) {
        log.info("开始盘点任务，taskId={}, operatorId={}", id, operatorId);

        StockCheckTask task = getById(id);
        if (task == null) {
            throw new BusinessException("盘点任务不存在");
        }

        if (task.getTaskStatus() != TASK_STATUS_PUBLISHED) {
            throw new BusinessException("任务状态不正确，无法开始盘点");
        }

        task.setTaskStatus(TASK_STATUS_IN_PROGRESS);
        task.setActualStartTime(LocalDateTime.now());
        task.setOperatorId(operatorId);
        task.setOperatorName(operatorName);

        return updateById(task);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean finishTask(Long id) {
        log.info("完成盘点任务，taskId={}", id);

        StockCheckTask task = getById(id);
        if (task == null) {
            throw new BusinessException("盘点任务不存在");
        }

        if (task.getTaskStatus() != TASK_STATUS_IN_PROGRESS) {
            throw new BusinessException("任务状态不正确，无法完成");
        }

        task.setTaskStatus(TASK_STATUS_FINISHED);
        task.setActualEndTime(LocalDateTime.now());

        boolean result = updateById(task);

        calculateDiff(id);

        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean uploadCheckData(StockCheckUploadDTO dto) {
        log.info("上传盘点数据，taskId={}, itemCount={}, recordCount={}",
                dto.getTaskId(), dto.getItems() != null ? dto.getItems().size() : 0,
                dto.getRecords() != null ? dto.getRecords().size() : 0);

        StockCheckTask task = getById(dto.getTaskId());
        if (task == null) {
            throw new BusinessException("盘点任务不存在");
        }

        if (task.getTaskStatus() < TASK_STATUS_IN_PROGRESS) {
            task.setTaskStatus(TASK_STATUS_IN_PROGRESS);
            task.setActualStartTime(dto.getActualStartTime() != null ? dto.getActualStartTime() : LocalDateTime.now());
            task.setOperatorId(dto.getOperatorId());
            task.setOperatorName(dto.getOperatorName());
            updateById(task);
        }

        if (dto.getItems() != null && !dto.getItems().isEmpty()) {
            for (StockCheckItemDTO itemDTO : dto.getItems()) {
                if (itemDTO.getId() != null) {
                    StockCheckItem item = stockCheckItemMapper.selectById(itemDTO.getId());
                    if (item != null) {
                        item.setActualStock(itemDTO.getActualStock());
                        item.setCheckStatus(itemDTO.getCheckStatus() != null ? itemDTO.getCheckStatus() : 1);
                        item.setRemark(itemDTO.getRemark());
                        stockCheckItemMapper.updateById(item);
                    }
                }
            }
        }

        if (dto.getRecords() != null && !dto.getRecords().isEmpty()) {
            for (StockCheckRecordDTO recordDTO : dto.getRecords()) {
                if (recordDTO.getIsDeleted() != null && recordDTO.getIsDeleted() == 1 && recordDTO.getId() != null) {
                    StockCheckRecord record = stockCheckRecordMapper.selectById(recordDTO.getId());
                    if (record != null) {
                        stockCheckRecordMapper.deleteById(record.getId());
                    }
                    continue;
                }

                StockCheckRecord record = new StockCheckRecord();
                if (recordDTO.getId() != null) {
                    StockCheckRecord existing = stockCheckRecordMapper.selectById(recordDTO.getId());
                    if (existing != null) {
                        record = existing;
                    }
                }
                BeanUtils.copyProperties(recordDTO, record);
                record.setTaskId(dto.getTaskId());
                record.setTaskNo(task.getTaskNo());
                record.setScanTime(recordDTO.getScanTime() != null ? recordDTO.getScanTime() : LocalDateTime.now());
                record.setDeviceId(dto.getDeviceId());

                if (record.getId() == null) {
                    stockCheckRecordMapper.insert(record);
                } else {
                    stockCheckRecordMapper.updateById(record);
                }
            }
        }

        log.info("盘点数据上传成功，taskId={}", dto.getTaskId());
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean calculateDiff(Long taskId) {
        log.info("计算盘点差异，taskId={}", taskId);

        stockCheckDiffMapper.delete(new LambdaQueryWrapper<StockCheckDiff>()
                .eq(StockCheckDiff::getTaskId, taskId));

        List<StockCheckItem> items = stockCheckItemMapper.selectList(
                new LambdaQueryWrapper<StockCheckItem>().eq(StockCheckItem::getTaskId, taskId));

        List<StockCheckDiff> diffList = new ArrayList<>();
        for (StockCheckItem item : items) {
            if (item.getTheoreticalStock() == null) {
                item.setTheoreticalStock(0);
            }
            if (item.getActualStock() == null) {
                item.setActualStock(0);
            }

            int diffQty = item.getActualStock() - item.getTheoreticalStock();
            BigDecimal diffAmount = item.getPrice() != null
                    ? item.getPrice().multiply(BigDecimal.valueOf(diffQty))
                    : BigDecimal.ZERO;

            item.setDiffQuantity(diffQty);
            item.setDiffAmount(diffAmount);
            stockCheckItemMapper.updateById(item);

            if (diffQty != 0) {
                StockCheckDiff diff = new StockCheckDiff();
                diff.setDiffNo(generateDiffNo());
                diff.setTaskId(taskId);
                diff.setTaskNo(item.getTaskNo());
                diff.setItemId(item.getId());
                diff.setProductId(item.getProductId());
                diff.setErpGoodsId(item.getErpGoodsId());
                diff.setProductName(item.getProductName());
                diff.setCategoryName(item.getCategoryName());
                diff.setUnit(item.getUnit());
                diff.setPrice(item.getPrice());
                diff.setTheoreticalStock(item.getTheoreticalStock());
                diff.setActualStock(item.getActualStock());
                diff.setDiffQuantity(diffQty);
                diff.setDiffAmount(diffAmount);
                diff.setDiffType(diffQty > 0 ? DIFF_TYPE_OVERAGE : DIFF_TYPE_LOSS);
                diff.setHandleStatus(HANDLE_STATUS_PENDING);
                diff.setOperatorName(item.getRemark());

                diffList.add(diff);
            }
        }

        if (!diffList.isEmpty()) {
            for (StockCheckDiff diff : diffList) {
                stockCheckDiffMapper.insert(diff);
            }
        }

        log.info("盘点差异计算完成，taskId={}, diffCount={}", taskId, diffList.size());
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean generateStockAdjust(Long diffId, Integer handleType) {
        log.info("生成库存调整单，diffId={}, handleType={}", diffId, handleType);

        StockCheckDiff diff = stockCheckDiffMapper.selectById(diffId);
        if (diff == null) {
            throw new BusinessException("差异记录不存在");
        }

        if (diff.getHandleStatus() == HANDLE_STATUS_PROCESSED || diff.getHandleStatus() == HANDLE_STATUS_SYNCED) {
            throw new BusinessException("该差异已处理");
        }

        String handleNo;
        if (HANDLE_TYPE_LOSS_REPORT.equals(handleType)) {
            handleNo = "BS" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        } else if (HANDLE_TYPE_STOCK_ADJUST.equals(handleType)) {
            handleNo = "SA" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        } else {
            throw new BusinessException("不支持的处理类型");
        }

        diff.setHandleType(handleType);
        diff.setHandleNo(handleNo);
        diff.setHandleTime(LocalDateTime.now());
        diff.setHandleStatus(HANDLE_STATUS_PROCESSED);
        stockCheckDiffMapper.updateById(diff);

        if (HANDLE_TYPE_STOCK_ADJUST.equals(handleType)) {
            ProductStock stock = productStockService.getStockByProductId(diff.getProductId());
            if (stock != null) {
                stock.setStock(diff.getActualStock());
                stock.setAvailableStock(diff.getActualStock() - stock.getFrozenStock());
                productStockService.updateById(stock);
            }
        }

        log.info("库存调整单生成成功，diffId={}, handleNo={}", diffId, handleNo);
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean syncTaskToErp(Long taskId) {
        log.info("同步盘点任务到ERP，taskId={}", taskId);

        StockCheckTask task = getById(taskId);
        if (task == null) {
            throw new BusinessException("盘点任务不存在");
        }

        List<StockCheckItem> items = stockCheckItemMapper.selectList(
                new LambdaQueryWrapper<StockCheckItem>().eq(StockCheckItem::getTaskId, taskId));

        List<Map<String, Object>> itemList = items.stream().map(item -> {
            Map<String, Object> map = new HashMap<>();
            map.put("erpGoodsId", item.getErpGoodsId());
            map.put("productName", item.getProductName());
            map.put("theoreticalStock", item.getTheoreticalStock());
            map.put("actualStock", item.getActualStock());
            map.put("diffQuantity", item.getDiffQuantity());
            map.put("diffAmount", item.getDiffAmount());
            return map;
        }).collect(Collectors.toList());

        Map<String, Object> requestData = new HashMap<>();
        requestData.put("taskNo", task.getTaskNo());
        requestData.put("taskName", task.getTaskName());
        requestData.put("checkMode", task.getCheckMode());
        requestData.put("shopId", task.getShopId());
        requestData.put("shopName", task.getShopName());
        requestData.put("operatorName", task.getOperatorName());
        requestData.put("actualStartTime", task.getActualStartTime());
        requestData.put("actualEndTime", task.getActualEndTime());
        requestData.put("items", itemList);

        try {
            Map<String, Object> response = erpApiClient.executeWithRetry("/stock/check/task/sync", requestData, HttpMethod.POST);
            log.info("盘点任务同步到ERP成功，taskId={}, response={}", taskId, response);

            task.setSyncStatus(1);
            updateById(task);

            return true;
        } catch (Exception e) {
            log.error("盘点任务同步到ERP失败，taskId={}", taskId, e);
            throw new BusinessException("同步到ERP失败: " + e.getMessage());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean syncDiffToErp(Long diffId) {
        log.info("同步盘点差异到ERP，diffId={}", diffId);

        StockCheckDiff diff = stockCheckDiffMapper.selectById(diffId);
        if (diff == null) {
            throw new BusinessException("差异记录不存在");
        }

        if (diff.getHandleStatus() != HANDLE_STATUS_PROCESSED) {
            throw new BusinessException("请先生成处理单据");
        }

        Map<String, Object> requestData = new HashMap<>();
        requestData.put("diffNo", diff.getDiffNo());
        requestData.put("taskNo", diff.getTaskNo());
        requestData.put("erpGoodsId", diff.getErpGoodsId());
        requestData.put("productName", diff.getProductName());
        requestData.put("theoreticalStock", diff.getTheoreticalStock());
        requestData.put("actualStock", diff.getActualStock());
        requestData.put("diffQuantity", diff.getDiffQuantity());
        requestData.put("diffAmount", diff.getDiffAmount());
        requestData.put("diffType", diff.getDiffType());
        requestData.put("handleType", diff.getHandleType());
        requestData.put("handleNo", diff.getHandleNo());
        requestData.put("handleTime", diff.getHandleTime());
        requestData.put("operatorName", diff.getOperatorName());
        requestData.put("remark", diff.getRemark());

        try {
            Map<String, Object> response = erpApiClient.executeWithRetry("/stock/check/diff/sync", requestData, HttpMethod.POST);
            log.info("盘点差异同步到ERP成功，diffId={}, response={}", diffId, response);

            diff.setHandleStatus(HANDLE_STATUS_SYNCED);
            stockCheckDiffMapper.updateById(diff);

            if (diff.getHandleType() == HANDLE_TYPE_STOCK_ADJUST) {
                erpApiClient.updateStock(diff.getErpGoodsId(), diff.getActualStock());
            }

            return true;
        } catch (Exception e) {
            log.error("盘点差异同步到ERP失败，diffId={}", diffId, e);
            throw new BusinessException("同步到ERP失败: " + e.getMessage());
        }
    }

    private void createTaskItems(Long taskId, String taskNo, List<Long> productIds) {
        for (Long productId : productIds) {
            Product product = productService.getById(productId);
            if (product == null) {
                continue;
            }

            ProductStock stock = productStockService.getStockByProductId(productId);

            StockCheckItem item = new StockCheckItem();
            item.setTaskId(taskId);
            item.setTaskNo(taskNo);
            item.setProductId(productId);
            item.setErpGoodsId(product.getErpGoodsId());
            item.setProductName(product.getProductName());
            item.setCategoryName(product.getCategoryName());
            item.setBarcode(product.getDescription());
            item.setUnit(product.getUnit());
            item.setPrice(product.getPrice());
            item.setTheoreticalStock(stock != null ? stock.getStock() : 0);
            item.setActualStock(null);
            item.setDiffQuantity(null);
            item.setDiffAmount(null);
            item.setCheckStatus(0);

            stockCheckItemMapper.insert(item);
        }
    }

    private String generateTaskNo() {
        return "PD" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
    }

    private String generateDiffNo() {
        return "DF" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean syncOrUpdateTaskFromErp(Map<String, Object> taskData) {
        String erpTaskId = taskData.get("erpTaskId") != null ? taskData.get("erpTaskId").toString() : null;
        if (erpTaskId == null) {
            log.warn("ERP任务ID为空，跳过同步");
            return false;
        }

        StockCheckTask existTask = lambdaQuery()
                .eq(StockCheckTask::getErpTaskId, erpTaskId)
                .one();

        StockCheckTask task = existTask != null ? existTask : new StockCheckTask();

        if (taskData.get("taskNo") != null) {
            task.setTaskNo(taskData.get("taskNo").toString());
        }
        if (taskData.get("taskName") != null) {
            task.setTaskName(taskData.get("taskName").toString());
        }
        if (taskData.get("taskType") != null) {
            task.setTaskType(Integer.valueOf(taskData.get("taskType").toString()));
        }
        if (taskData.get("checkMode") != null) {
            task.setCheckMode(Integer.valueOf(taskData.get("checkMode").toString()));
        }
        if (taskData.get("shopId") != null) {
            task.setShopId(Long.valueOf(taskData.get("shopId").toString()));
        }
        if (taskData.get("shopName") != null) {
            task.setShopName(taskData.get("shopName").toString());
        }
        if (taskData.get("categoryId") != null) {
            task.setCategoryId(Long.valueOf(taskData.get("categoryId").toString()));
        }
        if (taskData.get("categoryName") != null) {
            task.setCategoryName(taskData.get("categoryName").toString());
        }
        if (taskData.get("planStartTime") != null) {
            task.setPlanStartTime(LocalDateTime.parse(taskData.get("planStartTime").toString()));
        }
        if (taskData.get("planEndTime") != null) {
            task.setPlanEndTime(LocalDateTime.parse(taskData.get("planEndTime").toString()));
        }
        if (taskData.get("taskStatus") != null) {
            task.setTaskStatus(Integer.valueOf(taskData.get("taskStatus").toString()));
        }
        if (taskData.get("remark") != null) {
            task.setRemark(taskData.get("remark").toString());
        }

        if (existTask == null) {
            task.setErpTaskId(erpTaskId);
            task.setSyncStatus(0);
            save(task);
            log.info("从ERP创建盘点任务成功，erpTaskId={}, taskId={}", erpTaskId, task.getId());
        } else {
            updateById(task);
            log.info("从ERP更新盘点任务成功，erpTaskId={}, taskId={}", erpTaskId, task.getId());
        }

        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean syncTaskItemsFromErp(String erpTaskId, List<Map<String, Object>> items) {
        StockCheckTask task = lambdaQuery()
                .eq(StockCheckTask::getErpTaskId, erpTaskId)
                .one();
        if (task == null) {
            log.warn("盘点任务不存在，erpTaskId={}", erpTaskId);
            return false;
        }

        stockCheckItemMapper.delete(new LambdaQueryWrapper<StockCheckItem>()
                .eq(StockCheckItem::getTaskId, task.getId()));

        if (items != null && !items.isEmpty()) {
            for (Map<String, Object> itemData : items) {
                StockCheckItem item = new StockCheckItem();
                item.setTaskId(task.getId());
                item.setTaskNo(task.getTaskNo());

                if (itemData.get("erpGoodsId") != null) {
                    item.setErpGoodsId(itemData.get("erpGoodsId").toString());
                }
                if (itemData.get("productId") != null) {
                    item.setProductId(Long.valueOf(itemData.get("productId").toString()));
                }
                if (itemData.get("productName") != null) {
                    item.setProductName(itemData.get("productName").toString());
                }
                if (itemData.get("categoryName") != null) {
                    item.setCategoryName(itemData.get("categoryName").toString());
                }
                if (itemData.get("barcode") != null) {
                    item.setBarcode(itemData.get("barcode").toString());
                }
                if (itemData.get("unit") != null) {
                    item.setUnit(itemData.get("unit").toString());
                }
                if (itemData.get("price") != null) {
                    item.setPrice(new BigDecimal(itemData.get("price").toString()));
                }
                if (itemData.get("theoreticalStock") != null) {
                    item.setTheoreticalStock(Integer.valueOf(itemData.get("theoreticalStock").toString()));
                } else {
                    item.setTheoreticalStock(0);
                }

                item.setActualStock(null);
                item.setDiffQuantity(null);
                item.setDiffAmount(null);
                item.setCheckStatus(0);

                stockCheckItemMapper.insert(item);
            }
        }

        log.info("从ERP同步盘点任务明细成功，erpTaskId={}, itemCount={}", erpTaskId, items != null ? items.size() : 0);
        return true;
    }

    @Override
    public Map<String, Object> buildErpCheckResult(Long taskId) {
        StockCheckTask task = getById(taskId);
        if (task == null) {
            return null;
        }

        List<StockCheckItem> items = stockCheckItemMapper.selectList(
                new LambdaQueryWrapper<StockCheckItem>().eq(StockCheckItem::getTaskId, taskId));

        List<Map<String, Object>> itemList = new ArrayList<>();
        for (StockCheckItem item : items) {
            Map<String, Object> itemMap = new HashMap<>();
            itemMap.put("erpGoodsId", item.getErpGoodsId());
            itemMap.put("productName", item.getProductName());
            itemMap.put("theoreticalStock", item.getTheoreticalStock());
            itemMap.put("actualStock", item.getActualStock());
            itemMap.put("checkStatus", item.getCheckStatus());
            itemList.add(itemMap);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("erpTaskId", task.getErpTaskId());
        result.put("taskNo", task.getTaskNo());
        result.put("taskName", task.getTaskName());
        result.put("shopId", task.getShopId());
        result.put("shopName", task.getShopName());
        result.put("operatorId", task.getOperatorId());
        result.put("operatorName", task.getOperatorName());
        result.put("actualStartTime", task.getActualStartTime());
        result.put("actualEndTime", task.getActualEndTime());
        result.put("items", itemList);

        return result;
    }

    @Override
    public Map<String, Object> buildErpDiffData(Long diffId) {
        StockCheckDiff diff = stockCheckDiffMapper.selectById(diffId);
        if (diff == null) {
            return null;
        }

        StockCheckTask task = getById(diff.getTaskId());

        Map<String, Object> result = new HashMap<>();
        result.put("erpTaskId", task != null ? task.getErpTaskId() : null);
        result.put("diffNo", diff.getDiffNo());
        result.put("taskNo", diff.getTaskNo());
        result.put("erpGoodsId", diff.getErpGoodsId());
        result.put("productName", diff.getProductName());
        result.put("categoryName", diff.getCategoryName());
        result.put("unit", diff.getUnit());
        result.put("price", diff.getPrice());
        result.put("theoreticalStock", diff.getTheoreticalStock());
        result.put("actualStock", diff.getActualStock());
        result.put("diffQuantity", diff.getDiffQuantity());
        result.put("diffAmount", diff.getDiffAmount());
        result.put("diffType", diff.getDiffType());
        result.put("handleType", diff.getHandleType());
        result.put("handleNo", diff.getHandleNo());
        result.put("handleTime", diff.getHandleTime());
        result.put("handleStatus", diff.getHandleStatus());
        result.put("operatorName", diff.getOperatorName());
        result.put("remark", diff.getRemark());

        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> completeCheckProcess(Long taskId) {
        log.info("开始执行盘点完整处理流程，taskId={}", taskId);
        Map<String, Object> result = new HashMap<>();
        result.put("taskId", taskId);

        try {
            log.info("步骤1/4: 完成盘点任务");
            finishTask(taskId);
            result.put("finishTask", true);

            log.info("步骤2/4: 计算盘点差异");
            calculateDiff(taskId);
            result.put("calculateDiff", true);

            List<StockCheckDiff> diffList = stockCheckDiffMapper.selectList(
                    new LambdaQueryWrapper<StockCheckDiff>().eq(StockCheckDiff::getTaskId, taskId));
            result.put("diffCount", diffList.size());

            if (!diffList.isEmpty()) {
                log.info("步骤3/4: 生成报损单/库存调整单，共{}条差异", diffList.size());
                int lossReportCount = 0;
                int stockAdjustCount = 0;
                for (StockCheckDiff diff : diffList) {
                    Integer handleType = diff.getDiffType() == DIFF_TYPE_LOSS
                            ? HANDLE_TYPE_LOSS_REPORT
                            : HANDLE_TYPE_STOCK_ADJUST;
                    generateStockAdjust(diff.getId(), handleType);
                    if (handleType == HANDLE_TYPE_LOSS_REPORT) {
                        lossReportCount++;
                    } else {
                        stockAdjustCount++;
                    }
                }
                result.put("lossReportCount", lossReportCount);
                result.put("stockAdjustCount", stockAdjustCount);

                log.info("步骤4/4: 同步盘点结果和差异到ERP");
                try {
                    boolean syncResult = syncTaskToErp(taskId);
                    result.put("syncTaskToErp", syncResult);
                } catch (Exception e) {
                    log.warn("同步盘点任务到ERP失败，taskId={}, error={}", taskId, e.getMessage());
                    result.put("syncTaskToErp", false);
                    result.put("syncTaskError", e.getMessage());
                }

                try {
                    int syncedDiffCount = 0;
                    for (StockCheckDiff diff : diffList) {
                        try {
                            syncDiffToErp(diff.getId());
                            syncedDiffCount++;
                        } catch (Exception e) {
                            log.warn("同步差异到ERP失败，diffId={}, error={}", diff.getId(), e.getMessage());
                        }
                    }
                    result.put("syncedDiffCount", syncedDiffCount);
                } catch (Exception e) {
                    log.warn("同步差异到ERP异常，taskId={}, error={}", taskId, e.getMessage());
                    result.put("syncedDiffCount", 0);
                }
            } else {
                log.info("无差异数据，跳过单据生成和ERP同步");
                result.put("generateDocuments", false);
                result.put("syncToErp", false);
            }

            result.put("success", true);
            result.put("message", "盘点处理完成");
            log.info("盘点完整处理流程执行完成，taskId={}", taskId);

        } catch (Exception e) {
            log.error("盘点完整处理流程执行失败，taskId={}", taskId, e);
            result.put("success", false);
            result.put("message", "处理失败: " + e.getMessage());
            throw new BusinessException("盘点处理失败: " + e.getMessage());
        }

        return result;
    }
}
