package com.cashier.server.service.order;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.entity.order.SalesSummary;
import com.cashier.server.mapper.order.SalesSummaryMapper;
import org.springframework.stereotype.Service;

@Service
public class SalesSummaryServiceImpl extends ServiceImpl<SalesSummaryMapper, SalesSummary> implements SalesSummaryService {
}
