package com.cashier.server.service.order;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.common.BusinessException;
import com.cashier.server.dto.InvoiceCreateDTO;
import com.cashier.server.dto.InvoiceQrcodeScanDTO;
import com.cashier.server.dto.InvoiceSyncDTO;
import com.cashier.server.entity.order.ElectronicInvoice;
import com.cashier.server.entity.order.InvoiceWallet;
import com.cashier.server.mapper.order.ElectronicInvoiceMapper;
import com.cashier.server.mapper.order.InvoiceWalletMapper;
import com.cashier.server.service.tax.TaxControlApiClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class ElectronicInvoiceServiceImpl extends ServiceImpl<ElectronicInvoiceMapper, ElectronicInvoice> implements ElectronicInvoiceService {

    @Autowired
    private InvoiceWalletMapper invoiceWalletMapper;

    @Autowired
    private TaxControlApiClient taxControlApiClient;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ElectronicInvoice createInvoice(InvoiceCreateDTO dto) {
        log.info("开始创建预生成电子发票，orderNo={}", dto.getOrderNo());

        if (dto.getTotalAmount() == null || dto.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("发票金额不能为空或小于等于0");
        }

        ElectronicInvoice invoice = new ElectronicInvoice();
        BeanUtils.copyProperties(dto, invoice);

        invoice.setInvoiceNo(generateInvoiceNo());
        invoice.setQrcodeToken(generateQrcodeToken());

        BigDecimal taxRate = dto.getTaxRate() != null ? dto.getTaxRate() : BigDecimal.ZERO;
        BigDecimal[] taxResult = calculateTaxAmount(dto.getTotalAmount(), taxRate);
        invoice.setAmount(taxResult[0]);
        invoice.setTaxAmount(taxResult[1]);
        invoice.setTaxRate(taxRate);

        invoice.setInvoiceStatus(0);
        invoice.setSyncStatus(0);
        invoice.setTaxControlStatus(0);
        invoice.setScannedCount(0);

        this.save(invoice);
        log.info("预生成电子发票创建成功，invoiceNo={}", invoice.getInvoiceNo());
        return invoice;
    }

    @Override
    public ElectronicInvoice getInvoiceByQrcodeToken(String qrcodeToken) {
        return this.getOne(
            new LambdaQueryWrapper<ElectronicInvoice>()
                .eq(ElectronicInvoice::getQrcodeToken, qrcodeToken)
                .last("LIMIT 1")
        );
    }

    @Override
    public ElectronicInvoice getInvoiceByNo(String invoiceNo) {
        return this.getOne(
            new LambdaQueryWrapper<ElectronicInvoice>()
                .eq(ElectronicInvoice::getInvoiceNo, invoiceNo)
                .last("LIMIT 1")
        );
    }

    @Override
    public IPage<ElectronicInvoice> getInvoiceList(Long shopId, Integer invoiceStatus, Integer taxControlStatus, String startDate, String endDate, int page, int pageSize) {
        LambdaQueryWrapper<ElectronicInvoice> wrapper = new LambdaQueryWrapper<>();

        if (shopId != null) {
            wrapper.eq(ElectronicInvoice::getShopId, shopId);
        }
        if (invoiceStatus != null) {
            wrapper.eq(ElectronicInvoice::getInvoiceStatus, invoiceStatus);
        }
        if (taxControlStatus != null) {
            wrapper.eq(ElectronicInvoice::getTaxControlStatus, taxControlStatus);
        }
        if (startDate != null && !startDate.isEmpty()) {
            LocalDateTime start = LocalDate.parse(startDate).atStartOfDay();
            wrapper.ge(ElectronicInvoice::getCreateTime, start);
        }
        if (endDate != null && !endDate.isEmpty()) {
            LocalDateTime end = LocalDate.parse(endDate).atTime(LocalTime.MAX);
            wrapper.le(ElectronicInvoice::getCreateTime, end);
        }

        wrapper.orderByDesc(ElectronicInvoice::getCreateTime);
        return this.page(new Page<>(page, pageSize), wrapper);
    }

    @Override
    public List<ElectronicInvoice> getUnsyncedInvoices(int limit) {
        return this.list(
            new LambdaQueryWrapper<ElectronicInvoice>()
                .ne(ElectronicInvoice::getSyncStatus, 1)
                .orderByAsc(ElectronicInvoice::getCreateTime)
                .last("LIMIT " + limit)
        );
    }

    @Override
    public List<ElectronicInvoice> getUntaxedInvoices(int limit) {
        return this.list(
            new LambdaQueryWrapper<ElectronicInvoice>()
                .eq(ElectronicInvoice::getTaxControlStatus, 0)
                .eq(ElectronicInvoice::getInvoiceStatus, 0)
                .orderByAsc(ElectronicInvoice::getCreateTime)
                .last("LIMIT " + limit)
        );
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateSyncStatus(Long id, Integer status, String error) {
        ElectronicInvoice invoice = new ElectronicInvoice();
        invoice.setId(id);
        invoice.setSyncStatus(status);

        if (status == 1) {
            invoice.setSyncTime(LocalDateTime.now());
        }
        if (error != null) {
            invoice.setSyncError(error);
            ElectronicInvoice existing = this.getById(id);
            if (existing != null) {
                invoice.setSyncAttempts((existing.getSyncAttempts() != null ? existing.getSyncAttempts() : 0) + 1);
            }
        }

        return this.updateById(invoice);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateTaxControlStatus(Long id, Integer status, String error) {
        ElectronicInvoice invoice = new ElectronicInvoice();
        invoice.setId(id);
        invoice.setTaxControlStatus(status);

        if (status == 2) {
            invoice.setTaxControlTime(LocalDateTime.now());
        }
        if (error != null) {
            invoice.setTaxControlError(error);
            ElectronicInvoice existing = this.getById(id);
            if (existing != null) {
                invoice.setTaxControlAttempts((existing.getTaxControlAttempts() != null ? existing.getTaxControlAttempts() : 0) + 1);
            }
        }

        return this.updateById(invoice);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean batchSaveOrUpdateByDTO(List<InvoiceSyncDTO> dtos) {
        if (dtos == null || dtos.isEmpty()) {
            return true;
        }

        List<Long> toTaxControlList = new ArrayList<>();

        for (InvoiceSyncDTO dto : dtos) {
            ElectronicInvoice invoice = new ElectronicInvoice();
            BeanUtils.copyProperties(dto, invoice);

            ElectronicInvoice existing = getInvoiceByNo(dto.getInvoiceNo());
            Integer oldTaxControlStatus = existing != null ? existing.getTaxControlStatus() : null;

            invoice.setSyncStatus(1);
            invoice.setSyncTime(LocalDateTime.now());
            invoice.setSyncError(null);

            if (existing != null) {
                invoice.setId(existing.getId());
                if (dto.getInvoiceNo() == null || dto.getInvoiceNo().isEmpty()) {
                    invoice.setInvoiceNo(existing.getInvoiceNo());
                }
                if (dto.getQrcodeToken() == null || dto.getQrcodeToken().isEmpty()) {
                    invoice.setQrcodeToken(existing.getQrcodeToken());
                }
                if (dto.getTaxControlStatus() == null) {
                    invoice.setTaxControlStatus(existing.getTaxControlStatus());
                }
                this.updateById(invoice);
            } else {
                if (invoice.getInvoiceNo() == null || invoice.getInvoiceNo().isEmpty()) {
                    invoice.setInvoiceNo(generateInvoiceNo());
                }
                if (invoice.getQrcodeToken() == null || invoice.getQrcodeToken().isEmpty()) {
                    invoice.setQrcodeToken(generateQrcodeToken());
                }
                if (dto.getTaxControlStatus() == null) {
                    invoice.setTaxControlStatus(0);
                }
                if (dto.getSyncAttempts() == null) {
                    invoice.setSyncAttempts(0);
                }
                if (dto.getTaxControlAttempts() == null) {
                    invoice.setTaxControlAttempts(0);
                }
                if (dto.getScannedCount() == null) {
                    invoice.setScannedCount(0);
                }
                this.save(invoice);
            }

            Integer newTaxControlStatus = invoice.getTaxControlStatus();

            if (newTaxControlStatus != null && (newTaxControlStatus == 0 || newTaxControlStatus == 3)
                && (oldTaxControlStatus == null || oldTaxControlStatus == 0 || oldTaxControlStatus == 3)) {

                ElectronicInvoice savedInvoice = getInvoiceByNo(dto.getInvoiceNo());
                if (savedInvoice != null) {
                    toTaxControlList.add(savedInvoice.getId());
                }
            }
        }

        for (Long invoiceId : toTaxControlList) {
            try {
                issueInvoiceToTaxControl(invoiceId);
            } catch (Exception e) {
                log.error("同步后自动调用税控开票失败，invoiceId={}", invoiceId, e);
            }
        }

        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public InvoiceWallet scanInvoiceQrcode(InvoiceQrcodeScanDTO dto) {
        log.info("开始扫码存入票夹，qrcodeToken={}", dto.getQrcodeToken());

        ElectronicInvoice invoice = getInvoiceByQrcodeToken(dto.getQrcodeToken());
        if (invoice == null) {
            throw new BusinessException("发票不存在");
        }

        if (invoice.getInvoiceStatus() != null && invoice.getInvoiceStatus() == 2) {
            throw new BusinessException("发票已作废，无法存入票夹");
        }

        invoice.setScannedCount((invoice.getScannedCount() != null ? invoice.getScannedCount() : 0) + 1);
        invoice.setLastScannedTime(LocalDateTime.now());
        this.updateById(invoice);

        InvoiceWallet wallet = new InvoiceWallet();
        wallet.setWalletNo(generateWalletNo());
        wallet.setCustomerIdentifier(dto.getCustomerIdentifier());
        wallet.setCustomerType(dto.getCustomerType());
        wallet.setCustomerName(dto.getCustomerName());
        wallet.setCustomerPhone(dto.getCustomerPhone());
        wallet.setInvoiceId(invoice.getId());
        wallet.setInvoiceNo(invoice.getInvoiceNo());
        wallet.setInvoiceCode(invoice.getInvoiceCode());
        wallet.setInvoiceNumber(invoice.getInvoiceNumber());
        wallet.setInvoiceDate(invoice.getTaxControlTime());
        wallet.setInvoiceAmount(invoice.getTotalAmount());
        wallet.setBuyerName(invoice.getBuyerName());
        wallet.setShopId(invoice.getShopId());
        wallet.setShopName(invoice.getShopName());
        wallet.setScanSource(dto.getScanSource());
        wallet.setScanTime(LocalDateTime.now());
        wallet.setScanDeviceInfo(dto.getScanDeviceInfo());
        wallet.setWalletStatus(1);
        wallet.setIsRead(0);
        wallet.setIsFavorite(0);
        wallet.setRemark(dto.getRemark());
        wallet.setTags(dto.getTags());
        wallet.setSyncStatus(0);

        invoiceWalletMapper.insert(wallet);
        log.info("发票已存入票夹，walletNo={}, invoiceNo={}", wallet.getWalletNo(), invoice.getInvoiceNo());
        return wallet;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean issueInvoiceToTaxControl(Long invoiceId) {
        log.info("开始上传电子发票到税控系统，invoiceId={}", invoiceId);

        ElectronicInvoice invoice = this.getById(invoiceId);
        if (invoice == null) {
            throw new BusinessException("发票不存在");
        }

        if (invoice.getTaxControlStatus() != null && invoice.getTaxControlStatus() == 2) {
            log.info("发票已上传税控，无需重复上传，invoiceNo={}", invoice.getInvoiceNo());
            return true;
        }

        invoice.setTaxControlStatus(1);
        this.updateById(invoice);

        try {
            Map<String, Object> response = taxControlApiClient.issueInvoice(invoice);

            Object data = response.get("data");
            Map<String, Object> dataMap = null;
            if (data instanceof Map) {
                dataMap = (Map<String, Object>) data;
            }

            if (dataMap != null) {
                invoice.setInvoiceCode((String) dataMap.getOrDefault("invoiceCode", dataMap.get("fpdm")));
                invoice.setInvoiceNumber((String) dataMap.getOrDefault("invoiceNumber", dataMap.get("fphm")));
                invoice.setTaxControlSerialNo((String) dataMap.getOrDefault("taxControlSerialNo", dataMap.get("kplsh")));
                invoice.setTaxControlRequestId((String) dataMap.getOrDefault("taxControlRequestId", dataMap.get("requestId")));
                Object pdfUrl = dataMap.getOrDefault("invoicePdfUrl", dataMap.get("pdfUrl"));
                if (pdfUrl != null) {
                    invoice.setInvoicePdfUrl(pdfUrl.toString());
                }
            } else {
                invoice.setInvoiceCode((String) response.get("invoiceCode"));
                invoice.setInvoiceNumber((String) response.get("invoiceNumber"));
                invoice.setTaxControlSerialNo((String) response.get("taxControlSerialNo"));
                invoice.setTaxControlRequestId((String) response.get("taxControlRequestId"));
                if (response.get("invoicePdfUrl") != null) {
                    invoice.setInvoicePdfUrl(response.get("invoicePdfUrl").toString());
                }
            }

            invoice.setTaxControlTime(LocalDateTime.now());
            invoice.setTaxControlStatus(2);
            invoice.setInvoiceStatus(2);
            invoice.setTaxControlError(null);
            invoice.setTaxControlAttempts((invoice.getTaxControlAttempts() != null ? invoice.getTaxControlAttempts() : 0) + 1);

            this.updateById(invoice);
            log.info("电子发票税控开具成功，invoiceNo={}, invoiceNumber={}", invoice.getInvoiceNo(), invoice.getInvoiceNumber());

            try {
                pushInvoiceToCustomer(invoiceId);
            } catch (Exception e) {
                log.warn("税控成功后自动推送发票给顾客失败，invoiceNo={}", invoice.getInvoiceNo(), e);
            }

            return true;
        } catch (BusinessException e) {
            log.error("电子发票税控开具失败，invoiceNo={}", invoice.getInvoiceNo(), e);
            invoice.setTaxControlStatus(3);
            invoice.setTaxControlError(e.getMessage());
            invoice.setTaxControlAttempts((invoice.getTaxControlAttempts() != null ? invoice.getTaxControlAttempts() : 0) + 1);
            this.updateById(invoice);
            return false;
        } catch (Exception e) {
            log.error("电子发票税控开具系统异常，invoiceNo={}", invoice.getInvoiceNo(), e);
            invoice.setTaxControlStatus(3);
            invoice.setTaxControlError("系统异常: " + e.getMessage());
            invoice.setTaxControlAttempts((invoice.getTaxControlAttempts() != null ? invoice.getTaxControlAttempts() : 0) + 1);
            this.updateById(invoice);
            return false;
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean pushInvoiceToCustomer(Long invoiceId) {
        log.info("开始推送电子发票给顾客，invoiceId={}", invoiceId);

        ElectronicInvoice invoice = this.getById(invoiceId);
        if (invoice == null) {
            throw new BusinessException("发票不存在");
        }

        if (invoice.getPushStatus() != null && invoice.getPushStatus() == 2) {
            log.info("发票已推送，无需重复推送，invoiceNo={}", invoice.getInvoiceNo());
            return true;
        }

        String buyerPhone = invoice.getBuyerPhone();
        String buyerEmail = invoice.getBuyerEmail();

        if ((buyerPhone == null || buyerPhone.isEmpty()) && (buyerEmail == null || buyerEmail.isEmpty())) {
            log.warn("缺少接收方联系方式，无法推送发票，invoiceNo={}", invoice.getInvoiceNo());
            invoice.setPushStatus(3);
            invoice.setPushError("缺少接收方手机号或邮箱");
            invoice.setPushAttempts((invoice.getPushAttempts() != null ? invoice.getPushAttempts() : 0) + 1);
            this.updateById(invoice);
            return false;
        }

        try {
            Map<String, Object> response = taxControlApiClient.pushInvoiceToCustomer(
                invoice.getInvoiceNo(), buyerPhone, buyerEmail, invoice.getInvoicePdfUrl()
            );

            invoice.setPushStatus(2);
            invoice.setPushTime(LocalDateTime.now());
            invoice.setPushError(null);
            invoice.setPushAttempts((invoice.getPushAttempts() != null ? invoice.getPushAttempts() : 0) + 1);

            this.updateById(invoice);
            log.info("电子发票推送顾客成功，invoiceNo={}", invoice.getInvoiceNo());
            return true;
        } catch (BusinessException e) {
            log.error("电子发票推送顾客失败，invoiceNo={}", invoice.getInvoiceNo(), e);
            invoice.setPushStatus(3);
            invoice.setPushError(e.getMessage());
            invoice.setPushAttempts((invoice.getPushAttempts() != null ? invoice.getPushAttempts() : 0) + 1);
            this.updateById(invoice);
            return false;
        } catch (Exception e) {
            log.error("电子发票推送顾客系统异常，invoiceNo={}", invoice.getInvoiceNo(), e);
            invoice.setPushStatus(3);
            invoice.setPushError("系统异常: " + e.getMessage());
            invoice.setPushAttempts((invoice.getPushAttempts() != null ? invoice.getPushAttempts() : 0) + 1);
            this.updateById(invoice);
            return false;
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean queryInvoiceStatusFromTaxControl(Long invoiceId) {
        log.info("开始从税控查询发票状态，invoiceId={}", invoiceId);

        ElectronicInvoice invoice = this.getById(invoiceId);
        if (invoice == null) {
            throw new BusinessException("发票不存在");
        }

        if (invoice.getInvoiceNo() == null || invoice.getInvoiceNo().isEmpty()) {
            throw new BusinessException("发票编号为空，无法查询");
        }

        try {
            Map<String, Object> response = taxControlApiClient.queryInvoiceStatus(invoice.getInvoiceNo());

            Integer status = (Integer) response.get("invoiceStatus");
            if (status != null) {
                invoice.setInvoiceStatus(status);
            }

            String invoiceCode = (String) response.get("invoiceCode");
            if (invoiceCode != null) {
                invoice.setInvoiceCode(invoiceCode);
            }

            String invoiceNumber = (String) response.get("invoiceNumber");
            if (invoiceNumber != null) {
                invoice.setInvoiceNumber(invoiceNumber);
            }

            String taxControlSerialNo = (String) response.get("taxControlSerialNo");
            if (taxControlSerialNo != null) {
                invoice.setTaxControlSerialNo(taxControlSerialNo);
            }

            Integer taxControlStatus = (Integer) response.get("taxControlStatus");
            if (taxControlStatus != null) {
                invoice.setTaxControlStatus(taxControlStatus);
                if (taxControlStatus == 2 && invoice.getTaxControlTime() == null) {
                    invoice.setTaxControlTime(LocalDateTime.now());
                }
            }

            String invoicePdfUrl = (String) response.get("invoicePdfUrl");
            if (invoicePdfUrl != null) {
                invoice.setInvoicePdfUrl(invoicePdfUrl);
            }

            this.updateById(invoice);
            log.info("发票状态查询成功，invoiceNo={}, status={}", invoice.getInvoiceNo(), invoice.getInvoiceStatus());
            return true;
        } catch (Exception e) {
            log.error("从税控查询发票状态失败，invoiceNo={}", invoice.getInvoiceNo(), e);
            throw new BusinessException("查询发票状态失败: " + e.getMessage());
        }
    }

    @Override
    public String generateInvoiceNo() {
        String datetime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String random = String.format("%04d", new java.util.Random().nextInt(10000));
        return "INV" + datetime + random;
    }

    @Override
    public String generateQrcodeToken() {
        return "QR" + UUID.randomUUID().toString().replace("-", "");
    }

    @Override
    public BigDecimal[] calculateTaxAmount(BigDecimal totalAmount, BigDecimal taxRate) {
        if (totalAmount == null) {
            return new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO};
        }

        BigDecimal taxRateDecimal = taxRate != null ? taxRate : BigDecimal.ZERO;

        if (taxRateDecimal.compareTo(BigDecimal.ZERO) == 0) {
            return new BigDecimal[]{totalAmount.setScale(2, RoundingMode.HALF_UP), BigDecimal.ZERO};
        }

        BigDecimal divisor = BigDecimal.ONE.add(taxRateDecimal);
        BigDecimal amount = totalAmount.divide(divisor, 2, RoundingMode.HALF_UP);
        BigDecimal taxAmount = totalAmount.subtract(amount).setScale(2, RoundingMode.HALF_UP);

        return new BigDecimal[]{amount, taxAmount};
    }

    private String generateWalletNo() {
        String datetime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String random = String.format("%04d", new java.util.Random().nextInt(10000));
        return "WAL" + datetime + random;
    }

    @Override
    public List<ElectronicInvoice> getInvoicesByNos(List<String> invoiceNos) {
        if (invoiceNos == null || invoiceNos.isEmpty()) {
            return new ArrayList<>();
        }
        return this.list(
            new LambdaQueryWrapper<ElectronicInvoice>()
                .in(ElectronicInvoice::getInvoiceNo, invoiceNos)
        );
    }
}
