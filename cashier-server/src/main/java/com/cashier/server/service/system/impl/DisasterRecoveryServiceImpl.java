package com.cashier.server.service.system.impl;

import cn.hutool.core.util.IdUtil;
import com.alibaba.fastjson.JSON;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.common.BusinessException;
import com.cashier.server.common.TokenUtil;
import com.cashier.server.dto.DisasterRecoveryDataDTO;
import com.cashier.server.entity.order.Order;
import com.cashier.server.entity.order.OrderItem;
import com.cashier.server.entity.order.OrderPayment;
import com.cashier.server.entity.order.RefundOrder;
import com.cashier.server.entity.order.RefundOrderItem;
import com.cashier.server.entity.product.Product;
import com.cashier.server.entity.product.ProductStock;
import com.cashier.server.entity.system.CashierDevice;
import com.cashier.server.entity.system.DisasterRecoveryToken;
import com.cashier.server.entity.system.SysUser;
import com.cashier.server.mapper.system.DisasterRecoveryTokenMapper;
import com.cashier.server.service.order.OrderItemService;
import com.cashier.server.service.order.OrderPaymentService;
import com.cashier.server.service.order.OrderService;
import com.cashier.server.service.order.RefundOrderItemService;
import com.cashier.server.service.order.RefundOrderService;
import com.cashier.server.service.product.ProductService;
import com.cashier.server.service.product.ProductStockService;
import com.cashier.server.service.system.CashierDeviceService;
import com.cashier.server.service.system.DisasterRecoveryService;
import com.cashier.server.service.system.SysUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DisasterRecoveryServiceImpl extends ServiceImpl<DisasterRecoveryTokenMapper, DisasterRecoveryToken> implements DisasterRecoveryService {

    private static final int DEFAULT_DATA_HOURS = 1;
    private static final int DEFAULT_TOKEN_EXPIRE_MINUTES = 30;

    @Autowired
    private CashierDeviceService deviceService;

    @Autowired
    private TokenUtil tokenUtil;

    @Autowired
    private SysUserService sysUserService;

    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderItemService orderItemService;

    @Autowired
    private OrderPaymentService orderPaymentService;

    @Autowired
    private RefundOrderService refundOrderService;

    @Autowired
    private RefundOrderItemService refundOrderItemService;

    @Autowired
    private ProductService productService;

    @Autowired
    private ProductStockService productStockService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> createDisasterToken(Long operatorId, String operatorName, Integer dataHours, String syncScope) {
        CashierDevice mainDevice = getMainDevice();
        if (mainDevice == null) {
            throw new BusinessException("未找到主收银机设备，请先配置");
        }
        if (mainDevice.getDeviceStatus() != 1) {
            throw new BusinessException("主收银机当前状态异常，无法生成灾备Token");
        }

        if (dataHours == null || dataHours <= 0) {
            dataHours = DEFAULT_DATA_HOURS;
        }
        if (dataHours > 24) {
            dataHours = 24;
        }
        if (!StringUtils.hasText(syncScope)) {
            syncScope = "orders,products,stocks,members,refunds,payments";
        }

        String token = "DR" + IdUtil.fastSimpleUUID().toUpperCase();
        LocalDateTime expireTime = LocalDateTime.now().plusMinutes(DEFAULT_TOKEN_EXPIRE_MINUTES);

        SysUser operator = sysUserService.getById(operatorId);
        if (operator == null) {
            throw new BusinessException("操作用户不存在");
        }

        DisasterRecoveryToken drToken = new DisasterRecoveryToken();
        drToken.setToken(token);
        drToken.setShopId(1L);
        drToken.setShopName("默认门店");
        drToken.setMainDeviceId(mainDevice.getId());
        drToken.setMainDeviceNo(mainDevice.getDeviceNo());
        drToken.setMainDeviceName(mainDevice.getDeviceName());
        drToken.setMainDeviceIp(mainDevice.getIpAddress());
        drToken.setOperatorId(operatorId);
        drToken.setOperatorName(operatorName);
        drToken.setExpireTime(expireTime);
        drToken.setTokenStatus(0);
        drToken.setDataHours(dataHours);
        drToken.setSyncScope(syncScope);
        drToken.setDataSyncStatus(0);
        save(drToken);

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("expireTime", expireTime);
        result.put("dataHours", dataHours);
        result.put("syncScope", syncScope);
        result.put("mainDevice", mainDevice);
        result.put("operatorName", operatorName);
        result.put("qrcodeContent", buildQrcodeContent(token, mainDevice, dataHours));

        return result;
    }

    private String buildQrcodeContent(String token, CashierDevice device, Integer dataHours) {
        Map<String, Object> data = new HashMap<>();
        data.put("token", token);
        data.put("type", "disaster_recovery");
        data.put("mainDeviceNo", device.getDeviceNo());
        data.put("mainDeviceIp", device.getIpAddress());
        data.put("dataHours", dataHours);
        data.put("timestamp", System.currentTimeMillis());
        return JSON.toJSONString(data);
    }

    @Override
    public Map<String, Object> verifyDisasterToken(String token, String deviceNo) {
        if (!StringUtils.hasText(token)) {
            throw new BusinessException("Token不能为空");
        }

        LambdaQueryWrapper<DisasterRecoveryToken> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(DisasterRecoveryToken::getToken, token);
        DisasterRecoveryToken drToken = getOne(wrapper);

        if (drToken == null) {
            throw new BusinessException("无效的灾备登录Token");
        }
        if (drToken.getTokenStatus() == 1) {
            throw new BusinessException("该灾备Token已被使用");
        }
        if (drToken.getTokenStatus() == 2) {
            throw new BusinessException("该灾备Token已过期");
        }
        if (drToken.getTokenStatus() == 3) {
            throw new BusinessException("该灾备Token已被撤销");
        }
        if (drToken.getExpireTime().isBefore(LocalDateTime.now())) {
            drToken.setTokenStatus(2);
            updateById(drToken);
            throw new BusinessException("该灾备Token已过期");
        }

        CashierDevice mainDevice = deviceService.getById(drToken.getMainDeviceId());

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("valid", true);
        result.put("shopName", drToken.getShopName());
        result.put("mainDevice", mainDevice);
        result.put("mainDeviceStatus", mainDevice != null ? mainDevice.getDeviceStatus() : 0);
        result.put("dataHours", drToken.getDataHours());
        result.put("syncScope", drToken.getSyncScope());
        result.put("operatorName", drToken.getOperatorName());
        result.put("expireTime", drToken.getExpireTime());
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> useDisasterToken(String token, String deviceNo, String deviceInfo) {
        Map<String, Object> verifyResult = verifyDisasterToken(token, deviceNo);
        if (!(Boolean) verifyResult.get("valid")) {
            throw new BusinessException("Token验证失败");
        }

        LambdaQueryWrapper<DisasterRecoveryToken> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(DisasterRecoveryToken::getToken, token);
        DisasterRecoveryToken drToken = getOne(wrapper);

        CashierDevice backupDevice = deviceService.lambdaQuery()
                .eq(CashierDevice::getDeviceNo, deviceNo)
                .one();

        if (backupDevice == null) {
            backupDevice = registerDevice(deviceNo, "备用设备-" + deviceNo.substring(deviceNo.length() - 4), "backup", deviceInfo);
        }

        SysUser backupUser = sysUserService.getById(drToken.getOperatorId());
        if (backupUser == null) {
            throw new BusinessException("创建用户不存在");
        }

        String authToken = tokenUtil.createToken(backupUser);

        drToken.setTokenStatus(1);
        drToken.setUsedTime(LocalDateTime.now());
        drToken.setUsedDeviceId(backupDevice.getId());
        drToken.setUsedDeviceNo(deviceNo);
        drToken.setBackupUserId(backupUser.getId());
        drToken.setBackupUserName(backupUser.getNickname());
        drToken.setDataSyncStatus(1);
        updateById(drToken);

        backupDevice.setDeviceStatus(1);
        backupDevice.setLastLoginTime(LocalDateTime.now());
        backupDevice.setLastLoginUserId(backupUser.getId());
        backupDevice.setLastLoginUserName(backupUser.getNickname());
        backupDevice.setLastHeartbeat(LocalDateTime.now());
        deviceService.updateById(backupDevice);

        Map<String, Object> result = new HashMap<>();
        result.put("token", authToken);
        result.put("userInfo", backupUser);
        result.put("drToken", token);
        result.put("deviceInfo", backupDevice);
        result.put("dataHours", drToken.getDataHours());
        result.put("syncScope", drToken.getSyncScope());
        result.put("mainDeviceId", drToken.getMainDeviceId());
        result.put("mainDeviceNo", drToken.getMainDeviceNo());
        result.put("isDisasterMode", true);
        result.put("disasterModeStartTime", LocalDateTime.now());
        return result;
    }

    @Override
    public DisasterRecoveryDataDTO getDisasterRecoveryData(String token, Integer dataHours) {
        LambdaQueryWrapper<DisasterRecoveryToken> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(DisasterRecoveryToken::getToken, token);
        DisasterRecoveryToken drToken = getOne(wrapper);
        if (drToken == null) {
            throw new BusinessException("无效的灾备Token");
        }
        if (drToken.getTokenStatus() == 3) {
            throw new BusinessException("该灾备Token已被撤销");
        }

        if (dataHours == null || dataHours <= 0) {
            dataHours = drToken.getDataHours() != null ? drToken.getDataHours() : DEFAULT_DATA_HOURS;
        }

        LocalDateTime startTime = LocalDateTime.now().minusHours(dataHours);

        DisasterRecoveryDataDTO dto = new DisasterRecoveryDataDTO();
        dto.setDataHours(dataHours);
        dto.setSyncTime(LocalDateTime.now());

        CashierDevice mainDevice = deviceService.getById(drToken.getMainDeviceId());
        if (mainDevice != null) {
            DisasterRecoveryDataDTO.MainDeviceInfo info = new DisasterRecoveryDataDTO.MainDeviceInfo();
            info.setDeviceId(mainDevice.getId());
            info.setDeviceNo(mainDevice.getDeviceNo());
            info.setDeviceName(mainDevice.getDeviceName());
            info.setIpAddress(mainDevice.getIpAddress());
            info.setLastHeartbeat(mainDevice.getLastHeartbeat());
            dto.setMainDeviceInfo(info);
        }

        String syncScope = drToken.getSyncScope();

        if (syncScope.contains("orders")) {
            LambdaQueryWrapper<Order> orderWrapper = new LambdaQueryWrapper<>();
            orderWrapper.ge(Order::getCreateTime, startTime);
            orderWrapper.orderByDesc(Order::getCreateTime);
            List<Order> orders = orderService.list(orderWrapper);
            List<DisasterRecoveryDataDTO.OrderRecoveryDTO> orderDTOs = new ArrayList<>();
            for (Order order : orders) {
                DisasterRecoveryDataDTO.OrderRecoveryDTO od = new DisasterRecoveryDataDTO.OrderRecoveryDTO();
                od.setId(order.getId());
                od.setOrderNo(order.getOrderNo());
                od.setErpOrderId(order.getErpOrderId());
                od.setOrderType(1);
                od.setOrderAmount(order.getTotalAmount());
                od.setPayAmount(order.getPayAmount());
                od.setDiscountAmount(order.getDiscountAmount());
                od.setPayStatus(order.getPayStatus());
                od.setPayType(order.getPayStatus() == 1 ? "paid" : "unpaid");
                od.setBuyerName(order.getCashierName());
                od.setRemark(order.getRemark());
                od.setSyncStatus(order.getSyncStatus());
                od.setCreateTime(order.getCreateTime());
                try {
                    List<OrderItem> items = orderItemService.getOrderItems(order.getId());
                    od.setItemCount(items.size());
                    od.setItemsJson(JSON.toJSONString(items));
                } catch (Exception e) {
                    od.setItemCount(0);
                    od.setItemsJson("[]");
                }
                orderDTOs.add(od);
            }
            dto.setOrders(orderDTOs);
        }

        if (syncScope.contains("products")) {
            LambdaQueryWrapper<Product> productWrapper = new LambdaQueryWrapper<>();
            productWrapper.eq(Product::getStatus, 1);
            List<Product> products = productService.list(productWrapper);
            List<DisasterRecoveryDataDTO.ProductRecoveryDTO> productDTOs = new ArrayList<>();
            for (Product p : products) {
                DisasterRecoveryDataDTO.ProductRecoveryDTO pd = new DisasterRecoveryDataDTO.ProductRecoveryDTO();
                pd.setId(p.getId());
                pd.setErpGoodsId(p.getErpGoodsId());
                pd.setProductName(p.getProductName());
                pd.setBarcode(p.getBarcode());
                pd.setSpec(p.getSpec());
                pd.setCategoryId(p.getCategoryId());
                pd.setCategoryName(p.getCategoryName());
                pd.setPrice(p.getPrice());
                pd.setMemberPrice(p.getMemberPrice());
                pd.setImage(p.getImage());
                pd.setUnit(p.getUnit());
                pd.setStatus(p.getStatus());
                pd.setUpdateTime(p.getUpdateTime());
                productDTOs.add(pd);
            }
            dto.setProducts(productDTOs);
        }

        if (syncScope.contains("stocks")) {
            List<ProductStock> stocks = productStockService.list();
            List<DisasterRecoveryDataDTO.StockRecoveryDTO> stockDTOs = new ArrayList<>();
            for (ProductStock s : stocks) {
                DisasterRecoveryDataDTO.StockRecoveryDTO sd = new DisasterRecoveryDataDTO.StockRecoveryDTO();
                sd.setId(s.getId());
                sd.setProductId(s.getProductId());
                sd.setErpGoodsId(s.getErpGoodsId());
                sd.setProductName(s.getProductName());
                sd.setStock(s.getStock());
                sd.setFrozenStock(s.getFrozenStock());
                sd.setWarningStock(s.getWarningStock());
                sd.setUpdateTime(s.getUpdateTime());
                stockDTOs.add(sd);
            }
            dto.setStocks(stockDTOs);
        }

        if (syncScope.contains("refunds")) {
            LambdaQueryWrapper<RefundOrder> refundWrapper = new LambdaQueryWrapper<>();
            refundWrapper.ge(RefundOrder::getCreateTime, startTime);
            List<RefundOrder> refunds = refundOrderService.list(refundWrapper);
            List<DisasterRecoveryDataDTO.RefundRecoveryDTO> refundDTOs = new ArrayList<>();
            for (RefundOrder r : refunds) {
                DisasterRecoveryDataDTO.RefundRecoveryDTO rd = new DisasterRecoveryDataDTO.RefundRecoveryDTO();
                rd.setId(r.getId());
                rd.setRefundNo(r.getRefundNo());
                rd.setOrderId(r.getOrderId());
                rd.setOrderNo(r.getOrderNo());
                rd.setRefundType(r.getRefundType());
                rd.setRefundAmount(r.getRefundAmount());
                rd.setAuditStatus(r.getAuditStatus());
                rd.setRefundReason(r.getRefundReason());
                rd.setSyncStatus(r.getSyncStatus());
                rd.setCreateTime(r.getCreateTime());
                try {
                    List<RefundOrderItem> items = refundOrderService.getRefundOrderItems(r.getId());
                    rd.setItemsJson(JSON.toJSONString(items));
                } catch (Exception e) {
                    rd.setItemsJson("[]");
                }
                refundDTOs.add(rd);
            }
            dto.setRefundOrders(refundDTOs);
        }

        if (syncScope.contains("payments")) {
            List<Long> orderIds = dto.getOrders() != null ? dto.getOrders().stream()
                    .map(DisasterRecoveryDataDTO.OrderRecoveryDTO::getId)
                    .collect(Collectors.toList()) : new ArrayList<>();
            if (!orderIds.isEmpty()) {
                LambdaQueryWrapper<OrderPayment> payWrapper = new LambdaQueryWrapper<>();
                payWrapper.in(OrderPayment::getOrderId, orderIds);
                List<OrderPayment> payments = orderPaymentService.list(payWrapper);
                List<DisasterRecoveryDataDTO.PaymentRecoveryDTO> payDTOs = new ArrayList<>();
                for (OrderPayment p : payments) {
                    DisasterRecoveryDataDTO.PaymentRecoveryDTO pd = new DisasterRecoveryDataDTO.PaymentRecoveryDTO();
                    pd.setId(p.getId());
                    pd.setOrderId(p.getOrderId());
                    pd.setOrderNo(p.getOrderNo());
                    pd.setPayMethod(p.getPayMethod());
                    pd.setPayAmount(p.getPayAmount());
                    pd.setTransactionId(p.getTransactionId());
                    pd.setPayStatus(p.getPayStatus());
                    pd.setPayTime(p.getPayTime());
                    payDTOs.add(pd);
                }
                dto.setPayments(payDTOs);
            }
        }

        drToken.setDataSyncStatus(2);
        drToken.setDataSyncTime(LocalDateTime.now());
        updateById(drToken);

        return dto;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean heartbeat(String deviceNo, String ipAddress) {
        if (!StringUtils.hasText(deviceNo)) {
            return false;
        }
        LambdaQueryWrapper<CashierDevice> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CashierDevice::getDeviceNo, deviceNo);
        CashierDevice device = deviceService.getOne(wrapper);
        if (device == null) {
            return false;
        }
        device.setLastHeartbeat(LocalDateTime.now());
        if (StringUtils.hasText(ipAddress)) {
            device.setIpAddress(ipAddress);
        }
        if (device.getDeviceStatus() == 0) {
            device.setDeviceStatus(1);
        }
        return deviceService.updateById(device);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CashierDevice registerDevice(String deviceNo, String deviceName, String deviceType, String deviceInfo) {
        if (!StringUtils.hasText(deviceNo)) {
            throw new BusinessException("设备编号不能为空");
        }
        LambdaQueryWrapper<CashierDevice> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CashierDevice::getDeviceNo, deviceNo);
        CashierDevice existing = deviceService.getOne(wrapper);
        if (existing != null) {
            return existing;
        }

        CashierDevice device = new CashierDevice();
        device.setDeviceNo(deviceNo);
        device.setDeviceName(StringUtils.hasText(deviceName) ? deviceName : "设备-" + deviceNo.substring(deviceNo.length() - 6));
        device.setDeviceType(StringUtils.hasText(deviceType) ? deviceType : "tablet");
        device.setDeviceStatus(3);
        device.setIsActive(1);
        device.setIsMainDevice(0);
        if (StringUtils.hasText(deviceInfo)) {
            try {
                Map<String, Object> info = JSON.parseObject(deviceInfo);
                if (info.get("osType") != null) device.setOsType(info.get("osType").toString());
                if (info.get("osVersion") != null) device.setOsVersion(info.get("osVersion").toString());
                if (info.get("appVersion") != null) device.setAppVersion(info.get("appVersion").toString());
                if (info.get("deviceModel") != null) device.setDeviceModel(info.get("deviceModel").toString());
                if (info.get("macAddress") != null) device.setMacAddress(info.get("macAddress").toString());
            } catch (Exception ignore) {
            }
        }
        deviceService.save(device);
        return device;
    }

    @Override
    public IPage<CashierDevice> getDeviceList(Integer page, Integer size, String deviceType, Integer deviceStatus, String keyword) {
        LambdaQueryWrapper<CashierDevice> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(deviceType)) {
            wrapper.eq(CashierDevice::getDeviceType, deviceType);
        }
        if (deviceStatus != null) {
            wrapper.eq(CashierDevice::getDeviceStatus, deviceStatus);
        }
        if (StringUtils.hasText(keyword)) {
            wrapper.like(CashierDevice::getDeviceNo, keyword)
                    .or().like(CashierDevice::getDeviceName, keyword);
        }
        wrapper.orderByDesc(CashierDevice::getCreateTime);
        return deviceService.page(new Page<>(page, size), wrapper);
    }

    @Override
    public CashierDevice getMainDevice() {
        LambdaQueryWrapper<CashierDevice> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CashierDevice::getIsMainDevice, 1);
        wrapper.eq(CashierDevice::getIsActive, 1);
        wrapper.orderByDesc(CashierDevice::getLastHeartbeat);
        wrapper.last("LIMIT 1");
        return deviceService.getOne(wrapper);
    }

    @Override
    public List<CashierDevice> getOnlineDevices() {
        LocalDateTime fiveMinutesAgo = LocalDateTime.now().minusMinutes(5);
        LambdaQueryWrapper<CashierDevice> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CashierDevice::getDeviceStatus, 1);
        wrapper.ge(CashierDevice::getLastHeartbeat, fiveMinutesAgo);
        wrapper.eq(CashierDevice::getIsActive, 1);
        return deviceService.list(wrapper);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateDeviceStatus(String deviceNo, Integer status) {
        LambdaQueryWrapper<CashierDevice> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CashierDevice::getDeviceNo, deviceNo);
        CashierDevice device = deviceService.getOne(wrapper);
        if (device == null) {
            return false;
        }
        device.setDeviceStatus(status);
        return deviceService.updateById(device);
    }

    @Override
    public IPage<DisasterRecoveryToken> getTokenList(Integer page, Integer size, Integer tokenStatus, String keyword) {
        LambdaQueryWrapper<DisasterRecoveryToken> wrapper = new LambdaQueryWrapper<>();
        if (tokenStatus != null) {
            wrapper.eq(DisasterRecoveryToken::getTokenStatus, tokenStatus);
        }
        if (StringUtils.hasText(keyword)) {
            wrapper.like(DisasterRecoveryToken::getToken, keyword)
                    .or().like(DisasterRecoveryToken::getOperatorName, keyword)
                    .or().like(DisasterRecoveryToken::getMainDeviceName, keyword);
        }
        wrapper.orderByDesc(DisasterRecoveryToken::getCreateTime);
        return page(new Page<>(page, size), wrapper);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean revokeToken(Long tokenId) {
        DisasterRecoveryToken token = getById(tokenId);
        if (token == null) {
            return false;
        }
        if (token.getTokenStatus() == 1) {
            throw new BusinessException("已使用的Token无法撤销");
        }
        token.setTokenStatus(3);
        return updateById(token);
    }
}
