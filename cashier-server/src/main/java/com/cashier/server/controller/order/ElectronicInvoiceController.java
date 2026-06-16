package com.cashier.server.controller.order;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.BusinessException;
import com.cashier.server.common.Result;
import com.cashier.server.dto.InvoiceCreateDTO;
import com.cashier.server.dto.InvoiceQrcodeScanDTO;
import com.cashier.server.dto.InvoiceSyncDTO;
import com.cashier.server.entity.order.ElectronicInvoice;
import com.cashier.server.entity.order.InvoiceWallet;
import com.cashier.server.service.order.ElectronicInvoiceService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/invoice")
public class ElectronicInvoiceController {

    @Autowired
    private ElectronicInvoiceService electronicInvoiceService;

    @PostMapping("/create")
    public Result<ElectronicInvoice> create(@RequestBody InvoiceCreateDTO dto) {
        log.info("创建预生成发票，orderNo={}", dto.getOrderNo());
        try {
            ElectronicInvoice invoice = electronicInvoiceService.createInvoice(dto);
            return Result.success(invoice);
        } catch (BusinessException e) {
            log.error("创建预生成发票失败，orderNo={}", dto.getOrderNo(), e);
            return Result.fail(e.getMessage());
        } catch (Exception e) {
            log.error("创建预生成发票系统异常，orderNo={}", dto.getOrderNo(), e);
            return Result.fail("创建发票失败: " + e.getMessage());
        }
    }

    @GetMapping("/qrcode/{token}")
    public Result<ElectronicInvoice> getByQrcodeToken(@PathVariable String token) {
        log.info("通过二维码令牌查询发票，token={}", token);
        try {
            ElectronicInvoice invoice = electronicInvoiceService.getInvoiceByQrcodeToken(token);
            if (invoice == null) {
                return Result.fail("发票不存在");
            }
            return Result.success(invoice);
        } catch (Exception e) {
            log.error("通过二维码令牌查询发票失败，token={}", token, e);
            return Result.fail("查询发票失败: " + e.getMessage());
        }
    }

    @GetMapping("/{invoiceNo}")
    public Result<ElectronicInvoice> getByInvoiceNo(@PathVariable String invoiceNo) {
        log.info("通过发票编号查询，invoiceNo={}", invoiceNo);
        try {
            ElectronicInvoice invoice = electronicInvoiceService.getInvoiceByNo(invoiceNo);
            if (invoice == null) {
                return Result.fail("发票不存在");
            }
            return Result.success(invoice);
        } catch (Exception e) {
            log.error("通过发票编号查询失败，invoiceNo={}", invoiceNo, e);
            return Result.fail("查询发票失败: " + e.getMessage());
        }
    }

    @GetMapping("/list")
    public Result<IPage<ElectronicInvoice>> list(
            @RequestParam(required = false) Long shopId,
            @RequestParam(required = false) Integer invoiceStatus,
            @RequestParam(required = false) Integer taxControlStatus,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        log.info("分页查询发票列表，shopId={}, invoiceStatus={}, taxControlStatus={}", shopId, invoiceStatus, taxControlStatus);
        try {
            IPage<ElectronicInvoice> result = electronicInvoiceService.getInvoiceList(
                shopId, invoiceStatus, taxControlStatus, startDate, endDate, page, pageSize
            );
            return Result.success(result);
        } catch (Exception e) {
            log.error("分页查询发票列表失败", e);
            return Result.fail("查询发票列表失败: " + e.getMessage());
        }
    }

    @PostMapping("/scan")
    public Result<InvoiceWallet> scan(@RequestBody InvoiceQrcodeScanDTO dto) {
        log.info("扫码存入票夹，qrcodeToken={}", dto.getQrcodeToken());
        try {
            InvoiceWallet wallet = electronicInvoiceService.scanInvoiceQrcode(dto);
            return Result.success(wallet);
        } catch (BusinessException e) {
            log.error("扫码存入票夹失败，qrcodeToken={}", dto.getQrcodeToken(), e);
            return Result.fail(e.getMessage());
        } catch (Exception e) {
            log.error("扫码存入票夹系统异常，qrcodeToken={}", dto.getQrcodeToken(), e);
            return Result.fail("扫码存入票夹失败: " + e.getMessage());
        }
    }

    @PostMapping("/sync/batch")
    public Result<Map<String, Object>> batchSync(@RequestBody List<InvoiceSyncDTO> dtos) {
        log.info("批量同步发票，共{}条", dtos != null ? dtos.size() : 0);
        try {
            boolean success = electronicInvoiceService.batchSaveOrUpdateByDTO(dtos);

            List<String> invoiceNos = dtos.stream()
                .map(InvoiceSyncDTO::getInvoiceNo)
                .filter(no -> no != null && !no.isEmpty())
                .collect(Collectors.toList());

            List<ElectronicInvoice> syncedInvoices = electronicInvoiceService.getInvoicesByNos(invoiceNos);

            Map<String, Object> result = new HashMap<>();
            result.put("success", success);
            result.put("synced_invoices", syncedInvoices);
            return Result.success(result);
        } catch (Exception e) {
            log.error("批量同步发票失败", e);
            return Result.fail("批量同步发票失败: " + e.getMessage());
        }
    }

    @PostMapping("/tax/issue/{id}")
    public Result<Map<String, Object>> issueToTaxControl(@PathVariable Long id) {
        log.info("上传到税控开票，invoiceId={}", id);
        try {
            boolean success = electronicInvoiceService.issueInvoiceToTaxControl(id);
            return Result.success(Map.of("success", success));
        } catch (BusinessException e) {
            log.error("上传到税控开票失败，invoiceId={}", id, e);
            return Result.fail(e.getMessage());
        } catch (Exception e) {
            log.error("上传到税控开票系统异常，invoiceId={}", id, e);
            return Result.fail("上传到税控开票失败: " + e.getMessage());
        }
    }

    @PostMapping("/tax/query/{id}")
    public Result<Map<String, Object>> queryFromTaxControl(@PathVariable Long id) {
        log.info("从税控查询状态，invoiceId={}", id);
        try {
            boolean success = electronicInvoiceService.queryInvoiceStatusFromTaxControl(id);
            return Result.success(Map.of("success", success));
        } catch (BusinessException e) {
            log.error("从税控查询状态失败，invoiceId={}", id, e);
            return Result.fail(e.getMessage());
        } catch (Exception e) {
            log.error("从税控查询状态系统异常，invoiceId={}", id, e);
            return Result.fail("从税控查询状态失败: " + e.getMessage());
        }
    }

    @PostMapping("/push/{id}")
    public Result<Map<String, Object>> pushToCustomer(@PathVariable Long id) {
        log.info("推送给顾客，invoiceId={}", id);
        try {
            boolean success = electronicInvoiceService.pushInvoiceToCustomer(id);
            return Result.success(Map.of("success", success));
        } catch (BusinessException e) {
            log.error("推送给顾客失败，invoiceId={}", id, e);
            return Result.fail(e.getMessage());
        } catch (Exception e) {
            log.error("推送给顾客系统异常，invoiceId={}", id, e);
            return Result.fail("推送给顾客失败: " + e.getMessage());
        }
    }

    @GetMapping("/unsynced")
    public Result<List<ElectronicInvoice>> getUnsynced(@RequestParam(defaultValue = "50") int limit) {
        log.info("获取未同步发票列表，limit={}", limit);
        try {
            List<ElectronicInvoice> list = electronicInvoiceService.getUnsyncedInvoices(limit);
            return Result.success(list);
        } catch (Exception e) {
            log.error("获取未同步发票列表失败", e);
            return Result.fail("获取未同步发票列表失败: " + e.getMessage());
        }
    }

    @GetMapping("/untaxed")
    public Result<List<ElectronicInvoice>> getUntaxed(@RequestParam(defaultValue = "50") int limit) {
        log.info("获取未上传税控发票列表，limit={}", limit);
        try {
            List<ElectronicInvoice> list = electronicInvoiceService.getUntaxedInvoices(limit);
            return Result.success(list);
        } catch (Exception e) {
            log.error("获取未上传税控发票列表失败", e);
            return Result.fail("获取未上传税控发票列表失败: " + e.getMessage());
        }
    }
}
