package com.cashier.server.service.system.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.cashier.server.entity.system.CashierDevice;
import com.cashier.server.mapper.system.CashierDeviceMapper;
import com.cashier.server.service.system.CashierDeviceService;
import org.springframework.stereotype.Service;

@Service
public class CashierDeviceServiceImpl extends ServiceImpl<CashierDeviceMapper, CashierDevice> implements CashierDeviceService {
}
