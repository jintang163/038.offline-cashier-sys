package com.cashier.server.entity.printer;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("print_template")
public class PrintTemplate extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String templateCode;

    private String templateName;

    private String templateType;

    private String content;

    private Integer paperWidth;

    private Integer fontSize;

    private String header;

    private String footer;

    private Integer isDefault;

    private Integer status;
}
