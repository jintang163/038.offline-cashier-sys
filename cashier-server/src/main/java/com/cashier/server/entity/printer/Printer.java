package com.cashier.server.entity.printer;

import com.baomidou.mybatisplus.annotation.TableName;
import com.cashier.server.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("printer")
public class Printer extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String printerCode;

    private String printerName;

    private String printerType;

    private String connectionType;

    private String ipAddress;

    private Integer port;

    private String usbPath;

    private String bluetoothAddress;

    private Integer status;

    private Integer isDefault;

    private Integer sort;
}
