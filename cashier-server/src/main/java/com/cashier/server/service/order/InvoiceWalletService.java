package com.cashier.server.service.order;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.cashier.server.dto.InvoiceWalletSyncDTO;
import com.cashier.server.entity.order.InvoiceWallet;

import java.util.List;

public interface InvoiceWalletService extends IService<InvoiceWallet> {

    boolean saveToWallet(InvoiceWallet wallet);

    IPage<InvoiceWallet> getWalletList(String customerIdentifier, Integer walletStatus, String startDate, String endDate, int page, int pageSize);

    InvoiceWallet getWalletByInvoiceNo(String customerIdentifier, String invoiceNo);

    boolean updateWalletStatus(Long id, Integer status);

    boolean markAsRead(Long id);

    boolean toggleFavorite(Long id);

    List<InvoiceWallet> getUnsyncedWalletRecords(int limit);

    boolean updateSyncStatus(Long id, Integer status, String error);

    boolean batchSaveOrUpdateByDTO(List<InvoiceWalletSyncDTO> dtos);
}
