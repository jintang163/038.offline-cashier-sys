package com.cashier.server.controller.order;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.BusinessException;
import com.cashier.server.common.Result;
import com.cashier.server.dto.InvoiceWalletSyncDTO;
import com.cashier.server.entity.order.InvoiceWallet;
import com.cashier.server.service.order.InvoiceWalletService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/invoice-wallet")
public class InvoiceWalletController {

    @Autowired
    private InvoiceWalletService invoiceWalletService;

    @GetMapping("/list")
    public Result<IPage<InvoiceWallet>> list(
            @RequestParam String customerIdentifier,
            @RequestParam(required = false) Integer walletStatus,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        log.info("查询顾客票夹列表，customerIdentifier={}, walletStatus={}", customerIdentifier, walletStatus);
        try {
            IPage<InvoiceWallet> result = invoiceWalletService.getWalletList(
                customerIdentifier, walletStatus, startDate, endDate, page, pageSize
            );
            return Result.success(result);
        } catch (Exception e) {
            log.error("查询顾客票夹列表失败，customerIdentifier={}", customerIdentifier, e);
            return Result.fail("查询票夹列表失败: " + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public Result<InvoiceWallet> detail(@PathVariable Long id) {
        log.info("查询票夹详情，id={}", id);
        try {
            InvoiceWallet wallet = invoiceWalletService.getById(id);
            if (wallet == null) {
                return Result.fail("票夹记录不存在");
            }
            return Result.success(wallet);
        } catch (Exception e) {
            log.error("查询票夹详情失败，id={}", id, e);
            return Result.fail("查询票夹详情失败: " + e.getMessage());
        }
    }

    @PutMapping("/status/{id}")
    public Result<Map<String, Object>> updateStatus(
            @PathVariable Long id,
            @RequestParam Integer status) {
        log.info("更新票夹状态，id={}, status={}", id, status);
        try {
            boolean success = invoiceWalletService.updateWalletStatus(id, status);
            return Result.success(Map.of("success", success));
        } catch (BusinessException e) {
            log.error("更新票夹状态失败，id={}", id, e);
            return Result.fail(e.getMessage());
        } catch (Exception e) {
            log.error("更新票夹状态系统异常，id={}", id, e);
            return Result.fail("更新票夹状态失败: " + e.getMessage());
        }
    }

    @PutMapping("/read/{id}")
    public Result<Map<String, Object>> markAsRead(@PathVariable Long id) {
        log.info("标记票夹已读，id={}", id);
        try {
            boolean success = invoiceWalletService.markAsRead(id);
            return Result.success(Map.of("success", success));
        } catch (BusinessException e) {
            log.error("标记票夹已读失败，id={}", id, e);
            return Result.fail(e.getMessage());
        } catch (Exception e) {
            log.error("标记票夹已读系统异常，id={}", id, e);
            return Result.fail("标记票夹已读失败: " + e.getMessage());
        }
    }

    @PutMapping("/favorite/{id}")
    public Result<Map<String, Object>> toggleFavorite(@PathVariable Long id) {
        log.info("切换票夹收藏状态，id={}", id);
        try {
            boolean success = invoiceWalletService.toggleFavorite(id);
            return Result.success(Map.of("success", success));
        } catch (BusinessException e) {
            log.error("切换票夹收藏状态失败，id={}", id, e);
            return Result.fail(e.getMessage());
        } catch (Exception e) {
            log.error("切换票夹收藏状态系统异常，id={}", id, e);
            return Result.fail("切换票夹收藏状态失败: " + e.getMessage());
        }
    }

    @PostMapping("/sync/batch")
    public Result<Map<String, Object>> batchSync(@RequestBody List<InvoiceWalletSyncDTO> dtos) {
        log.info("批量同步票夹记录，共{}条", dtos != null ? dtos.size() : 0);
        try {
            boolean success = invoiceWalletService.batchSaveOrUpdateByDTO(dtos);
            return Result.success(Map.of("success", success));
        } catch (Exception e) {
            log.error("批量同步票夹记录失败", e);
            return Result.fail("批量同步票夹记录失败: " + e.getMessage());
        }
    }
}
