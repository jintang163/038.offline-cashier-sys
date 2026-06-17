package com.cashier.server.controller.fraud;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.Result;
import com.cashier.server.entity.fraud.FraudAlert;
import com.cashier.server.service.fraud.FraudAlertService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/fraud/alerts")
public class FraudAlertController {

    @Autowired
    private FraudAlertService fraudAlertService;

    @GetMapping("/list")
    public Result<IPage<FraudAlert>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String alertType,
            @RequestParam(required = false) Integer riskLevel,
            @RequestParam(required = false) String status) {
        return Result.success(fraudAlertService.getAlertList(page, size, alertType, riskLevel, status));
    }

    @GetMapping("/{id}")
    public Result<FraudAlert> detail(@PathVariable Long id) {
        return Result.success(fraudAlertService.getById(id));
    }

    @GetMapping("/new")
    public Result<List<FraudAlert>> getNewAlerts() {
        return Result.success(fraudAlertService.getNewAlerts());
    }

    @GetMapping("/new/count")
    public Result<Integer> getNewAlertCount() {
        return Result.success(fraudAlertService.getNewAlertCount());
    }

    @PostMapping("/{id}/acknowledge")
    public Result<Void> acknowledge(
            @PathVariable Long id,
            @RequestBody Map<String, Object> params) {
        Long assigneeId = params.get("assigneeId") != null ? Long.valueOf(params.get("assigneeId").toString()) : null;
        String assigneeName = params.get("assigneeName") != null ? params.get("assigneeName").toString() : null;
        fraudAlertService.acknowledgeAlert(id, assigneeId, assigneeName);
        return Result.success();
    }

    @PostMapping("/{id}/resolve")
    public Result<Void> resolve(
            @PathVariable Long id,
            @RequestBody Map<String, Object> params) {
        String resolveRemark = params.get("resolveRemark") != null ? params.get("resolveRemark").toString() : null;
        fraudAlertService.resolveAlert(id, resolveRemark);
        return Result.success();
    }

    @PostMapping("/{id}/close")
    public Result<Void> close(
            @PathVariable Long id,
            @RequestBody Map<String, Object> params) {
        String resolveRemark = params.get("resolveRemark") != null ? params.get("resolveRemark").toString() : null;
        fraudAlertService.closeAlert(id, resolveRemark);
        return Result.success();
    }
}
