package com.cashier.server.service.order;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.entity.order.RefundOrderItem;
import com.cashier.server.mapper.order.RefundOrderItemMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RefundOrderItemServiceImpl extends ServiceImpl<RefundOrderItemMapper, RefundOrderItem> implements RefundOrderItemService {

    @Override
    public List<RefundOrderItem> getByRefundOrderId(Long refundOrderId) {
        return lambdaQuery()
                .eq(RefundOrderItem::getRefundOrderId, refundOrderId)
                .list();
    }
}
