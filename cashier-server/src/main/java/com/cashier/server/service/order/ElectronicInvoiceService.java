package com.cashier.server.service.order;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.dto.InvoiceCreateDTO;
import com.cashier.server.dto.InvoiceQrcodeScanDTO;
import com.cashier.server.dto.InvoiceSyncDTO;
import com.cashier.server.entity.order.ElectronicInvoice;
import com.cashier.server.entity.order.InvoiceWallet;

import java.math.BigDecimal;
import java.util.List;

public interface ElectronicInvoiceService extends IService<ElectronicInvoice> {

    ElectronicInvoice createInvoice(InvoiceCreateDTO dto);

    ElectronicInvoice getInvoiceByQrcodeToken(String qrcodeToken);

    ElectronicInvoice getInvoiceByNo(String invoiceNo);

    IPage<ElectronicInvoice> getInvoiceList(Long shopId, Integer invoiceStatus, Integer taxControlStatus, String startDate, String endDate, int page, int pageSize);

    List<ElectronicInvoice> getUnsyncedInvoices(int limit);

    List<ElectronicInvoice> getUntaxedInvoices(int limit);

    boolean updateSyncStatus(Long id, Integer status, String error);

    boolean updateTaxControlStatus(Long id, Integer status, String error);

    boolean batchSaveOrUpdateByDTO(List<InvoiceSyncDTO> dtos);

    InvoiceWallet scanInvoiceQrcode(InvoiceQrcodeScanDTO dto);

    boolean issueInvoiceToTaxControl(Long invoiceId);

    boolean pushInvoiceToCustomer(Long invoiceId);

    boolean queryInvoiceStatusFromTaxControl(Long invoiceId);

    String generateInvoiceNo();

    String generateQrcodeToken();

    BigDecimal[] calculateTaxAmount(BigDecimal totalAmount, BigDecimal taxRate);
}
