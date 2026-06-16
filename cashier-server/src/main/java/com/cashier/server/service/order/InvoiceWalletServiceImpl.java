package com.cashier.server.service.order;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.common.BusinessException;
import com.cashier.server.dto.InvoiceWalletSyncDTO;
import com.cashier.server.entity.order.InvoiceWallet;
import com.cashier.server.mapper.order.InvoiceWalletMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
public class InvoiceWalletServiceImpl extends ServiceImpl<InvoiceWalletMapper, InvoiceWallet> implements InvoiceWalletService {

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean saveToWallet(InvoiceWallet wallet) {
        log.info("开始存入票夹，customerIdentifier={}, invoiceId={}", wallet.getCustomerIdentifier(), wallet.getInvoiceId());

        if (wallet.getCustomerIdentifier() == null || wallet.getCustomerIdentifier().isEmpty()) {
            throw new BusinessException("客户标识不能为空");
        }
        if (wallet.getInvoiceId() == null) {
            throw new BusinessException("发票ID不能为空");
        }

        InvoiceWallet existing = this.getOne(
            new LambdaQueryWrapper<InvoiceWallet>()
                .eq(InvoiceWallet::getCustomerIdentifier, wallet.getCustomerIdentifier())
                .eq(InvoiceWallet::getInvoiceId, wallet.getInvoiceId())
                .last("LIMIT 1")
        );

        if (existing != null) {
            log.warn("该发票已存在于客户票夹中，customerIdentifier={}, invoiceId={}", wallet.getCustomerIdentifier(), wallet.getInvoiceId());
            throw new BusinessException("该发票已存在于您的票夹中");
        }

        if (wallet.getWalletNo() == null || wallet.getWalletNo().isEmpty()) {
            wallet.setWalletNo(generateWalletNo());
        }
        if (wallet.getWalletStatus() == null) {
            wallet.setWalletStatus(1);
        }
        if (wallet.getIsRead() == null) {
            wallet.setIsRead(0);
        }
        if (wallet.getIsFavorite() == null) {
            wallet.setIsFavorite(0);
        }
        if (wallet.getSyncStatus() == null) {
            wallet.setSyncStatus(0);
        }
        if (wallet.getScanTime() == null) {
            wallet.setScanTime(LocalDateTime.now());
        }

        boolean result = this.save(wallet);
        log.info("存入票夹成功，walletNo={}", wallet.getWalletNo());
        return result;
    }

    @Override
    public IPage<InvoiceWallet> getWalletList(String customerIdentifier, Integer walletStatus, String startDate, String endDate, int page, int pageSize) {
        LambdaQueryWrapper<InvoiceWallet> wrapper = new LambdaQueryWrapper<>();

        if (customerIdentifier != null && !customerIdentifier.isEmpty()) {
            wrapper.eq(InvoiceWallet::getCustomerIdentifier, customerIdentifier);
        }
        if (walletStatus != null) {
            wrapper.eq(InvoiceWallet::getWalletStatus, walletStatus);
        }
        if (startDate != null && !startDate.isEmpty()) {
            LocalDateTime start = LocalDate.parse(startDate).atStartOfDay();
            wrapper.ge(InvoiceWallet::getScanTime, start);
        }
        if (endDate != null && !endDate.isEmpty()) {
            LocalDateTime end = LocalDate.parse(endDate).atTime(LocalTime.MAX);
            wrapper.le(InvoiceWallet::getScanTime, end);
        }

        wrapper.orderByDesc(InvoiceWallet::getScanTime);
        return this.page(new Page<>(page, pageSize), wrapper);
    }

    @Override
    public InvoiceWallet getWalletByInvoiceNo(String customerIdentifier, String invoiceNo) {
        return this.getOne(
            new LambdaQueryWrapper<InvoiceWallet>()
                .eq(InvoiceWallet::getCustomerIdentifier, customerIdentifier)
                .eq(InvoiceWallet::getInvoiceNo, invoiceNo)
                .last("LIMIT 1")
        );
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateWalletStatus(Long id, Integer status) {
        log.info("更新票夹状态，id={}, status={}", id, status);

        InvoiceWallet wallet = new InvoiceWallet();
        wallet.setId(id);
        wallet.setWalletStatus(status);

        return this.updateById(wallet);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean markAsRead(Long id) {
        log.info("标记票夹已读，id={}", id);

        InvoiceWallet wallet = new InvoiceWallet();
        wallet.setId(id);
        wallet.setIsRead(1);

        return this.updateById(wallet);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean toggleFavorite(Long id) {
        log.info("切换票夹收藏状态，id={}", id);

        InvoiceWallet existing = this.getById(id);
        if (existing == null) {
            throw new BusinessException("票夹记录不存在");
        }

        Integer currentFavorite = existing.getIsFavorite();
        Integer newFavorite = (currentFavorite == null || currentFavorite == 0) ? 1 : 0;

        InvoiceWallet wallet = new InvoiceWallet();
        wallet.setId(id);
        wallet.setIsFavorite(newFavorite);

        return this.updateById(wallet);
    }

    @Override
    public List<InvoiceWallet> getUnsyncedWalletRecords(int limit) {
        return this.list(
            new LambdaQueryWrapper<InvoiceWallet>()
                .ne(InvoiceWallet::getSyncStatus, 1)
                .orderByAsc(InvoiceWallet::getCreateTime)
                .last("LIMIT " + limit)
        );
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateSyncStatus(Long id, Integer status, String error) {
        log.info("更新票夹同步状态，id={}, status={}", id, status);

        InvoiceWallet wallet = new InvoiceWallet();
        wallet.setId(id);
        wallet.setSyncStatus(status);

        if (status == 1) {
            wallet.setSyncTime(LocalDateTime.now());
        }
        if (error != null) {
            log.error("票夹同步失败，id={}, error={}", id, error);
        }

        return this.updateById(wallet);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean batchSaveOrUpdateByDTO(List<InvoiceWalletSyncDTO> dtos) {
        if (dtos == null || dtos.isEmpty()) {
            return true;
        }

        for (InvoiceWalletSyncDTO dto : dtos) {
            InvoiceWallet wallet = new InvoiceWallet();
            BeanUtils.copyProperties(dto, wallet);

            InvoiceWallet existing = this.getOne(
                new LambdaQueryWrapper<InvoiceWallet>()
                    .eq(InvoiceWallet::getWalletNo, dto.getWalletNo())
                    .last("LIMIT 1")
            );

            if (existing != null) {
                wallet.setId(existing.getId());
                if (dto.getWalletNo() == null || dto.getWalletNo().isEmpty()) {
                    wallet.setWalletNo(existing.getWalletNo());
                }
                if (dto.getSyncStatus() == null) {
                    wallet.setSyncStatus(existing.getSyncStatus());
                }
                this.updateById(wallet);
            } else {
                if (wallet.getWalletNo() == null || wallet.getWalletNo().isEmpty()) {
                    wallet.setWalletNo(generateWalletNo());
                }
                if (dto.getSyncStatus() == null) {
                    wallet.setSyncStatus(0);
                }
                if (dto.getIsRead() == null) {
                    wallet.setIsRead(0);
                }
                if (dto.getIsFavorite() == null) {
                    wallet.setIsFavorite(0);
                }
                if (dto.getWalletStatus() == null) {
                    wallet.setWalletStatus(1);
                }
                this.save(wallet);
            }
        }

        log.info("批量同步票夹记录完成，共{}条", dtos.size());
        return true;
    }

    private String generateWalletNo() {
        String datetime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String random = String.format("%04d", new java.util.Random().nextInt(10000));
        return "WAL" + datetime + random;
    }
}
