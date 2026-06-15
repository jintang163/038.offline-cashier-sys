package com.cashier.server.mapper.product;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cashier.server.entity.product.ProductStock;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ProductStockMapper extends BaseMapper<ProductStock> {
}
