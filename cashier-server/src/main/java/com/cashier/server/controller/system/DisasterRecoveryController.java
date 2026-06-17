package com.cashier.server.controller.system;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.Result;
import com.cashier.server.dto.DisasterRecoveryDataDTO;
import com.cashier.server.entity.system.CashierDevice;
import com.cashier.server.entity.system.DisasterRecoveryToken;
import com.cashier.server.entity.system.SysUser;
import com.cashier.server.service.system.DisasterRecoveryService;
import com.cashier.server.service.system.SysUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/disaster")
public class DisasterRecoveryController {

    @Autowired
    private DisasterRecoveryService disasterRecoveryService;

    @Autowired
    private SysUserService sysUserService;

    @Autowired
    private HttpServletRequest request;

    private Long getCurrentUserId() {
        String token = request.getHeader("Authorization");
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        if (token == null || token.isEmpty()) {
            return null;
        }
        try {
            Object userId = request.getAttribute("userId");
            if (userId instanceof Long) {
                return (Long) userId;
            }
            if (userId instanceof Integer) {
                return ((Integer) userId).longValue();
            }
        } catch (Exception e) {
            return null;
        }
        return null;
    }

    private String getCurrentUserName() {
        Long userId = getCurrentUserId();
        if (userId != null) {
            SysUser user = sysUserService.getById(userId);
            if (user != null) {
                return user.getNickname() != null ? user.getNickname() : user.getUsername();
            }
        }
        return "未知用户";
    }

    @PostMapping("/token")
    public Result<Map<String, Object>> createDisasterToken(@RequestBody Map<String, Object> params) {
        Long operatorId = getCurrentUserId();
        if (operatorId == null) {
            return Result.fail("请先登录");
        }
        Integer dataHours = params.get("dataHours") != null ? Integer.valueOf(params.get("dataHours").toString()) : 1;
        String syncScope = params.get("syncScope") != null ? params.get("syncScope").toString() : null;
        String operatorName = getCurrentUserName();
        Map<String, Object> result = disasterRecoveryService.createDisasterToken(operatorId, operatorName, dataHours, syncScope);
        return Result.success(result);
    }

    @GetMapping("/token/verify")
    public Result<Map<String, Object>> verifyDisasterToken(
            @RequestParam String token,
            @RequestParam(required = false) String deviceNo) {
        Map<String, Object> result = disasterRecoveryService.verifyDisasterToken(token, deviceNo);
        return Result.success(result);
    }

    @PostMapping("/token/use")
    public Result<Map<String, Object>> useDisasterToken(@RequestBody Map<String, Object> params) {
        String token = params.get("token") != null ? params.get("token").toString() : null;
        String deviceNo = params.get("deviceNo") != null ? params.get("deviceNo").toString() : null;
        String deviceInfo = params.get("deviceInfo") != null ? params.get("deviceInfo").toString() : null;
        Map<String, Object> result = disasterRecoveryService.useDisasterToken(token, deviceNo, deviceInfo);
        return Result.success(result);
    }

    @GetMapping("/data")
    public Result<DisasterRecoveryDataDTO> getDisasterRecoveryData(
            @RequestParam String token,
            @RequestParam(required = false) Integer dataHours) {
        DisasterRecoveryDataDTO data = disasterRecoveryService.getDisasterRecoveryData(token, dataHours);
        return Result.success(data);
    }

    @PostMapping("/heartbeat")
    public Result<Map<String, Object>> heartbeat(@RequestBody Map<String, Object> params) {
        String deviceNo = params.get("deviceNo") != null ? params.get("deviceNo").toString() : null;
        String ipAddress = params.get("ipAddress") != null ? params.get("ipAddress").toString() : null;
        boolean success = disasterRecoveryService.heartbeat(deviceNo, ipAddress);
        Map<String, Object> result = new HashMap<>();
        result.put("success", success);
        result.put("timestamp", System.currentTimeMillis());
        return Result.success(result);
    }

    @PostMapping("/device/register")
    public Result<CashierDevice> registerDevice(@RequestBody Map<String, Object> params) {
        String deviceNo = params.get("deviceNo") != null ? params.get("deviceNo").toString() : null;
        String deviceName = params.get("deviceName") != null ? params.get("deviceName").toString() : null;
        String deviceType = params.get("deviceType") != null ? params.get("deviceType").toString() : "backup";
        String deviceInfo = params.get("deviceInfo") != null ? params.get("deviceInfo").toString() : null;
        CashierDevice device = disasterRecoveryService.registerDevice(deviceNo, deviceName, deviceType, deviceInfo);
        return Result.success(device);
    }

    @GetMapping("/device/list")
    public Result<IPage<CashierDevice>> getDeviceList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String deviceType,
            @RequestParam(required = false) Integer deviceStatus,
            @RequestParam(required = false) String keyword) {
        IPage<CashierDevice> result = disasterRecoveryService.getDeviceList(page, size, deviceType, deviceStatus, keyword);
        return Result.success(result);
    }

    @GetMapping("/device/main")
    public Result<CashierDevice> getMainDevice() {
        CashierDevice device = disasterRecoveryService.getMainDevice();
        return Result.success(device);
    }

    @GetMapping("/device/online")
    public Result<List<CashierDevice>> getOnlineDevices() {
        List<CashierDevice> devices = disasterRecoveryService.getOnlineDevices();
        return Result.success(devices);
    }

    @PutMapping("/device/{deviceNo}/status")
    public Result<Boolean> updateDeviceStatus(
            @PathVariable String deviceNo,
            @RequestParam Integer status) {
        boolean success = disasterRecoveryService.updateDeviceStatus(deviceNo, status);
        return Result.success(success);
    }

    @GetMapping("/token/list")
    public Result<IPage<DisasterRecoveryToken>> getTokenList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) Integer tokenStatus,
            @RequestParam(required = false) String keyword) {
        IPage<DisasterRecoveryToken> result = disasterRecoveryService.getTokenList(page, size, tokenStatus, keyword);
        return Result.success(result);
    }

    @PutMapping("/token/{id}/revoke")
    public Result<Boolean> revokeToken(@PathVariable Long id) {
        boolean success = disasterRecoveryService.revokeToken(id);
        return Result.success(success);
    }
}
