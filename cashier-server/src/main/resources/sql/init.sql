-- 离线餐饮收银系统数据库初始化脚本
-- 创建数据库
CREATE DATABASE IF NOT EXISTS cashier_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

USE cashier_db;

-- 用户表
DROP TABLE IF EXISTS sys_user;
CREATE TABLE sys_user (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    username VARCHAR(50) NOT NULL COMMENT '用户名',
    password VARCHAR(100) NOT NULL COMMENT '密码',
    nickname VARCHAR(50) DEFAULT NULL COMMENT '昵称',
    phone VARCHAR(20) DEFAULT NULL COMMENT '手机号',
    email VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
    avatar VARCHAR(500) DEFAULT NULL COMMENT '头像',
    status TINYINT DEFAULT 1 COMMENT '状态：0禁用 1启用',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_username (username),
    KEY idx_phone (phone),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统用户表';

-- 用户角色关联表
DROP TABLE IF EXISTS sys_user_role;
CREATE TABLE sys_user_role (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    role_id BIGINT NOT NULL COMMENT '角色ID',
    role_code VARCHAR(50) DEFAULT NULL COMMENT '角色编码',
    role_name VARCHAR(50) DEFAULT NULL COMMENT '角色名称',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (id),
    KEY idx_user_id (user_id),
    KEY idx_role_id (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户角色关联表';

-- 商品分类表
DROP TABLE IF EXISTS product_category;
CREATE TABLE product_category (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    erp_category_id VARCHAR(64) DEFAULT NULL COMMENT 'ERP分类ID',
    category_name VARCHAR(100) NOT NULL COMMENT '分类名称',
    sort INT DEFAULT 0 COMMENT '排序',
    status TINYINT DEFAULT 1 COMMENT '状态：0禁用 1启用',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_erp_category_id (erp_category_id),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品分类表';

-- 商品表
DROP TABLE IF EXISTS product;
CREATE TABLE product (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    erp_goods_id VARCHAR(64) DEFAULT NULL COMMENT 'ERP商品ID',
    product_name VARCHAR(200) NOT NULL COMMENT '商品名称',
    category_id BIGINT DEFAULT NULL COMMENT '分类ID',
    category_name VARCHAR(100) DEFAULT NULL COMMENT '分类名称',
    price DECIMAL(10,2) DEFAULT 0.00 COMMENT '售价',
    original_price DECIMAL(10,2) DEFAULT 0.00 COMMENT '原价',
    unit VARCHAR(20) DEFAULT NULL COMMENT '单位',
    image VARCHAR(500) DEFAULT NULL COMMENT '商品图片',
    description VARCHAR(1000) DEFAULT NULL COMMENT '商品描述',
    stock INT DEFAULT 0 COMMENT '库存数量',
    status TINYINT DEFAULT 1 COMMENT '状态：0下架 1上架',
    sort INT DEFAULT 0 COMMENT '排序',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_erp_goods_id (erp_goods_id),
    KEY idx_category_id (category_id),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品表';

-- 商品库存表
DROP TABLE IF EXISTS product_stock;
CREATE TABLE product_stock (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    product_id BIGINT NOT NULL COMMENT '商品ID',
    erp_goods_id VARCHAR(64) DEFAULT NULL COMMENT 'ERP商品ID',
    stock INT DEFAULT 0 COMMENT '总库存',
    frozen_stock INT DEFAULT 0 COMMENT '冻结库存',
    available_stock INT DEFAULT 0 COMMENT '可用库存',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_product_id (product_id),
    UNIQUE KEY uk_erp_goods_id (erp_goods_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品库存表';

-- 订单表
DROP TABLE IF EXISTS order_info;
CREATE TABLE order_info (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    order_no VARCHAR(64) NOT NULL COMMENT '订单号',
    erp_order_id VARCHAR(64) DEFAULT NULL COMMENT 'ERP订单ID',
    total_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '订单总金额',
    discount_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '优惠金额',
    pay_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '实付金额',
    pay_status TINYINT DEFAULT 0 COMMENT '支付状态：0未支付 1已支付',
    order_status TINYINT DEFAULT 1 COMMENT '订单状态：1待支付 2已支付 3已完成 4已取消',
    sync_status TINYINT DEFAULT 0 COMMENT '同步状态：0未同步 1已同步 2同步失败',
    sync_attempts INT DEFAULT 0 COMMENT '同步重试次数',
    sync_error_message VARCHAR(500) DEFAULT NULL COMMENT '同步错误信息',
    cashier_id BIGINT DEFAULT NULL COMMENT '收银员ID',
    cashier_name VARCHAR(50) DEFAULT NULL COMMENT '收银员姓名',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_order_no (order_no),
    KEY idx_sync_status (sync_status),
    KEY idx_pay_status (pay_status),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- 订单明细表
DROP TABLE IF EXISTS order_item;
CREATE TABLE order_item (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    order_id BIGINT NOT NULL COMMENT '订单ID',
    order_no VARCHAR(64) NOT NULL COMMENT '订单号',
    product_id BIGINT DEFAULT NULL COMMENT '商品ID',
    erp_goods_id VARCHAR(64) DEFAULT NULL COMMENT 'ERP商品ID',
    product_name VARCHAR(200) NOT NULL COMMENT '商品名称',
    image VARCHAR(500) DEFAULT NULL COMMENT '商品图片',
    price DECIMAL(10,2) DEFAULT 0.00 COMMENT '单价',
    quantity INT DEFAULT 1 COMMENT '数量',
    total_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '小计金额',
    discount_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '优惠金额',
    pay_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '实付金额',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (id),
    KEY idx_order_id (order_id),
    KEY idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单明细表';

-- 订单支付流水表
DROP TABLE IF EXISTS order_payment;
CREATE TABLE order_payment (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    order_id BIGINT NOT NULL COMMENT '订单ID',
    order_no VARCHAR(64) NOT NULL COMMENT '订单号',
    payment_no VARCHAR(64) NOT NULL COMMENT '支付流水号',
    erp_payment_id VARCHAR(64) DEFAULT NULL COMMENT 'ERP支付ID',
    pay_type VARCHAR(20) DEFAULT NULL COMMENT '支付方式：cash现金 wechat微信 alipay支付宝 member会员卡',
    pay_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '支付金额',
    pay_status TINYINT DEFAULT 0 COMMENT '支付状态：0待支付 1支付成功 2支付失败',
    pay_time DATETIME DEFAULT NULL COMMENT '支付时间',
    transaction_id VARCHAR(100) DEFAULT NULL COMMENT '第三方交易流水号',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_payment_no (payment_no),
    KEY idx_order_id (order_id),
    KEY idx_pay_status (pay_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单支付流水表';

-- 销售汇总表
DROP TABLE IF EXISTS sales_summary;
CREATE TABLE sales_summary (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    erp_goods_id VARCHAR(64) DEFAULT NULL COMMENT 'ERP商品ID',
    product_name VARCHAR(200) DEFAULT NULL COMMENT '商品名称',
    quantity INT DEFAULT 0 COMMENT '销售数量',
    total_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '销售总金额',
    order_date DATE DEFAULT NULL COMMENT '订单日期',
    sync_status TINYINT DEFAULT 0 COMMENT '同步状态：0未同步 1已同步 2同步失败',
    sync_attempts INT DEFAULT 0 COMMENT '同步重试次数',
    sync_error VARCHAR(500) DEFAULT NULL COMMENT '同步错误信息',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (id),
    KEY idx_erp_goods_id (erp_goods_id),
    KEY idx_order_date (order_date),
    KEY idx_sync_status (sync_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售汇总表';

-- 初始测试数据
INSERT INTO product_category (erp_category_id, category_name, sort, status, create_time, update_time) VALUES
('CAT001', '热菜', 1, 1, NOW(), NOW()),
('CAT002', '凉菜', 2, 1, NOW(), NOW()),
('CAT003', '主食', 3, 1, NOW(), NOW()),
('CAT004', '饮品', 4, 1, NOW(), NOW()),
('CAT005', '甜品', 5, 1, NOW(), NOW());

INSERT INTO product (erp_goods_id, product_name, category_id, category_name, price, original_price, unit, stock, status, sort, create_time, update_time) VALUES
('G001', '宫保鸡丁', 1, '热菜', 38.00, 42.00, '份', 50, 1, 1, NOW(), NOW()),
('G002', '麻婆豆腐', 1, '热菜', 28.00, 32.00, '份', 60, 1, 2, NOW(), NOW()),
('G003', '鱼香肉丝', 1, '热菜', 32.00, 36.00, '份', 45, 1, 3, NOW(), NOW()),
('G004', '凉拌黄瓜', 2, '凉菜', 12.00, 15.00, '份', 80, 1, 1, NOW(), NOW()),
('G005', '皮蛋豆腐', 2, '凉菜', 18.00, 20.00, '份', 40, 1, 2, NOW(), NOW()),
('G006', '米饭', 3, '主食', 2.00, 3.00, '碗', 200, 1, 1, NOW(), NOW()),
('G007', '牛肉面', 3, '主食', 25.00, 28.00, '碗', 30, 1, 2, NOW(), NOW()),
('G008', '可乐', 4, '饮品', 6.00, 8.00, '瓶', 100, 1, 1, NOW(), NOW()),
('G009', '橙汁', 4, '饮品', 12.00, 15.00, '杯', 50, 1, 2, NOW(), NOW()),
('G010', '提拉米苏', 5, '甜品', 28.00, 32.00, '份', 20, 1, 1, NOW(), NOW());

-- 初始用户数据 (密码: 123456, MD5加密)
INSERT INTO sys_user (username, password, nickname, phone, email, status, create_time, update_time) VALUES
('admin', 'e10adc3949ba59abbe56e057f20f883e', '管理员', '13800138000', 'admin@example.com', 1, NOW(), NOW()),
('cashier', 'e10adc3949ba59abbe56e057f20f883e', '收银员', '13800138001', 'cashier@example.com', 1, NOW(), NOW());

-- 打印机表
DROP TABLE IF EXISTS printer;
CREATE TABLE printer (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    printer_code VARCHAR(50) NOT NULL COMMENT '打印机编码',
    printer_name VARCHAR(100) NOT NULL COMMENT '打印机名称',
    printer_type VARCHAR(20) DEFAULT 'kitchen' COMMENT '打印机类型：kitchen厨房 receipt收银',
    connection_type VARCHAR(20) DEFAULT 'network' COMMENT '连接方式：network网络 usb蓝牙 bluetooth蓝牙',
    ip_address VARCHAR(50) DEFAULT NULL COMMENT 'IP地址',
    port INT DEFAULT 9100 COMMENT '端口号',
    usb_path VARCHAR(200) DEFAULT NULL COMMENT 'USB路径',
    bluetooth_address VARCHAR(100) DEFAULT NULL COMMENT '蓝牙地址',
    status TINYINT DEFAULT 1 COMMENT '状态：0禁用 1启用',
    is_default TINYINT DEFAULT 0 COMMENT '是否默认：0否 1是',
    sort INT DEFAULT 0 COMMENT '排序',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_printer_code (printer_code),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打印机表';

-- 打印分单规则表
DROP TABLE IF EXISTS print_rule;
CREATE TABLE print_rule (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    rule_code VARCHAR(50) NOT NULL COMMENT '规则编码',
    rule_name VARCHAR(100) NOT NULL COMMENT '规则名称',
    category_id BIGINT DEFAULT NULL COMMENT '菜品分类ID',
    category_name VARCHAR(100) DEFAULT NULL COMMENT '菜品分类名称',
    printer_id BIGINT DEFAULT NULL COMMENT '打印机ID',
    printer_code VARCHAR(50) DEFAULT NULL COMMENT '打印机编码',
    copies INT DEFAULT 1 COMMENT '打印份数',
    priority INT DEFAULT 0 COMMENT '优先级，数值越大优先级越高',
    sort INT DEFAULT 0 COMMENT '排序',
    status TINYINT DEFAULT 1 COMMENT '状态：0禁用 1启用',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_rule_code (rule_code),
    KEY idx_category_id (category_id),
    KEY idx_printer_id (printer_id),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打印分单规则表';

-- 打印模板表
DROP TABLE IF EXISTS print_template;
CREATE TABLE print_template (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    template_code VARCHAR(50) NOT NULL COMMENT '模板编码',
    template_name VARCHAR(100) NOT NULL COMMENT '模板名称',
    template_type VARCHAR(20) DEFAULT 'kitchen' COMMENT '模板类型：kitchen厨房 receipt收银',
    content TEXT DEFAULT NULL COMMENT '模板内容JSON',
    paper_width INT DEFAULT 80 COMMENT '纸张宽度mm',
    font_size INT DEFAULT 12 COMMENT '字体大小',
    header VARCHAR(500) DEFAULT NULL COMMENT '页眉内容',
    footer VARCHAR(500) DEFAULT NULL COMMENT '页脚内容',
    is_default TINYINT DEFAULT 0 COMMENT '是否默认：0否 1是',
    status TINYINT DEFAULT 1 COMMENT '状态：0禁用 1启用',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_template_code (template_code),
    KEY idx_template_type (template_type),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打印模板表';

-- 打印历史记录表
DROP TABLE IF EXISTS print_history;
CREATE TABLE print_history (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    queue_id BIGINT DEFAULT NULL COMMENT '打印队列ID',
    order_id BIGINT DEFAULT NULL COMMENT '订单ID',
    order_no VARCHAR(64) DEFAULT NULL COMMENT '订单号',
    printer_id BIGINT DEFAULT NULL COMMENT '打印机ID',
    printer_code VARCHAR(50) DEFAULT NULL COMMENT '打印机编码',
    category_id BIGINT DEFAULT NULL COMMENT '菜品分类ID',
    items_count INT DEFAULT 0 COMMENT '菜品数量',
    copies INT DEFAULT 1 COMMENT '打印份数',
    print_status TINYINT DEFAULT 0 COMMENT '打印状态：0待打印 1打印中 2成功 3失败 4已取消',
    print_time DATETIME DEFAULT NULL COMMENT '打印时间',
    error_message VARCHAR(500) DEFAULT NULL COMMENT '错误信息',
    cashier_id BIGINT DEFAULT NULL COMMENT '收银员ID',
    cashier_name VARCHAR(50) DEFAULT NULL COMMENT '收银员姓名',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (id),
    KEY idx_order_id (order_id),
    KEY idx_printer_id (printer_id),
    KEY idx_print_status (print_status),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打印历史记录表';

-- 营业日报表
DROP TABLE IF EXISTS daily_report;
CREATE TABLE daily_report (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    report_no VARCHAR(32) NOT NULL COMMENT '日报编号',
    report_date DATE NOT NULL COMMENT '报表日期',
    shop_id BIGINT DEFAULT NULL COMMENT '门店ID',
    shop_name VARCHAR(100) DEFAULT NULL COMMENT '门店名称',
    total_orders INT DEFAULT 0 COMMENT '总订单数',
    total_amount DECIMAL(12,2) DEFAULT 0.00 COMMENT '营业总额',
    discount_amount DECIMAL(12,2) DEFAULT 0.00 COMMENT '优惠总额',
    refund_amount DECIMAL(12,2) DEFAULT 0.00 COMMENT '退菜/退款总额',
    actual_amount DECIMAL(12,2) DEFAULT 0.00 COMMENT '实收金额',
    cash_amount DECIMAL(12,2) DEFAULT 0.00 COMMENT '现金收款',
    wechat_amount DECIMAL(12,2) DEFAULT 0.00 COMMENT '微信收款',
    alipay_amount DECIMAL(12,2) DEFAULT 0.00 COMMENT '支付宝收款',
    member_card_amount DECIMAL(12,2) DEFAULT 0.00 COMMENT '会员卡收款',
    other_pay_amount DECIMAL(12,2) DEFAULT 0.00 COMMENT '其他支付方式金额',
    member_discount_amount DECIMAL(12,2) DEFAULT 0.00 COMMENT '会员优惠金额',
    points_deduction_amount DECIMAL(12,2) DEFAULT 0.00 COMMENT '积分抵扣金额',
    total_items INT DEFAULT 0 COMMENT '商品总数量',
    avg_order_amount DECIMAL(12,2) DEFAULT 0.00 COMMENT '客单价',
    new_member_count INT DEFAULT 0 COMMENT '新增会员数',
    cashier_id BIGINT DEFAULT NULL COMMENT '结账收银员ID',
    cashier_name VARCHAR(50) DEFAULT NULL COMMENT '结账收银员姓名',
    report_status TINYINT DEFAULT 1 COMMENT '报表状态: 0-草稿 1-已确认 2-已审核',
    sync_status TINYINT DEFAULT 0 COMMENT '同步状态: 0-未同步 1-已同步 2-同步失败',
    sync_attempts INT DEFAULT 0 COMMENT '同步重试次数',
    sync_error VARCHAR(500) DEFAULT NULL COMMENT '同步错误信息',
    sync_time DATETIME DEFAULT NULL COMMENT '同步时间',
    erp_push_status TINYINT DEFAULT 0 COMMENT 'ERP推送状态: 0-未推送 1-已推送 2-推送失败',
    erp_push_time DATETIME DEFAULT NULL COMMENT 'ERP推送时间',
    erp_push_error VARCHAR(500) DEFAULT NULL COMMENT 'ERP推送错误',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_report_no (report_no),
    UNIQUE KEY uk_report_date_shop (report_date, shop_id),
    KEY idx_sync_status (sync_status),
    KEY idx_erp_push_status (erp_push_status),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='营业日报表';

-- 电子发票表
DROP TABLE IF EXISTS electronic_invoice;
CREATE TABLE electronic_invoice (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    invoice_no VARCHAR(64) NOT NULL COMMENT '发票编号（本地预生成）',
    invoice_code VARCHAR(64) DEFAULT NULL COMMENT '发票代码（税控返回）',
    invoice_number VARCHAR(64) DEFAULT NULL COMMENT '发票号码（税控返回）',
    order_id BIGINT DEFAULT NULL COMMENT '关联订单ID',
    order_no VARCHAR(64) DEFAULT NULL COMMENT '关联订单编号',
    shop_id BIGINT DEFAULT NULL COMMENT '门店ID',
    shop_name VARCHAR(100) DEFAULT NULL COMMENT '门店名称',
    shop_tax_no VARCHAR(64) DEFAULT NULL COMMENT '门店税号',
    buyer_name VARCHAR(200) DEFAULT NULL COMMENT '购方名称',
    buyer_tax_no VARCHAR(64) DEFAULT NULL COMMENT '购方税号',
    buyer_phone VARCHAR(20) DEFAULT NULL COMMENT '购方手机号',
    buyer_email VARCHAR(100) DEFAULT NULL COMMENT '购方邮箱',
    buyer_address VARCHAR(500) DEFAULT NULL COMMENT '购方地址',
    buyer_bank VARCHAR(200) DEFAULT NULL COMMENT '购方银行账号',
    total_amount DECIMAL(12,2) DEFAULT 0.00 COMMENT '价税合计金额',
    amount DECIMAL(12,2) DEFAULT 0.00 COMMENT '不含税金额',
    tax_amount DECIMAL(12,2) DEFAULT 0.00 COMMENT '税额',
    tax_rate DECIMAL(6,4) DEFAULT 0.0000 COMMENT '税率',
    invoice_type TINYINT DEFAULT 1 COMMENT '发票类型: 1-增值税普通发票 2-增值税专用发票',
    invoice_title_type TINYINT DEFAULT 1 COMMENT '抬头类型: 1-个人 2-企业',
    invoice_status TINYINT DEFAULT 0 COMMENT '发票状态: 0-待开具 1-开具中 2-已开具 3-已红冲 4-开具失败',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    qrcode_token VARCHAR(128) NOT NULL COMMENT '二维码令牌（本地生成，用于扫码识别）',
    qrcode_content TEXT DEFAULT NULL COMMENT '二维码内容（离线时预生成，联网后更新）',
    qrcode_url VARCHAR(500) DEFAULT NULL COMMENT '二维码图片URL',
    invoice_pdf_url VARCHAR(500) DEFAULT NULL COMMENT '发票PDF下载URL',
    invoice_pdf_blob LONGBLOB DEFAULT NULL COMMENT '发票PDF二进制数据',
    tax_control_serial_no VARCHAR(64) DEFAULT NULL COMMENT '税控流水号',
    tax_control_request_id VARCHAR(64) DEFAULT NULL COMMENT '税控请求ID',
    tax_control_time DATETIME DEFAULT NULL COMMENT '税控开具时间',
    tax_control_status TINYINT DEFAULT 0 COMMENT '税控状态: 0-未上传 1-上传中 2-上传成功 3-上传失败',
    tax_control_error VARCHAR(500) DEFAULT NULL COMMENT '税控错误信息',
    tax_control_attempts INT DEFAULT 0 COMMENT '税控上传重试次数',
    push_status TINYINT DEFAULT 0 COMMENT '推送状态: 0-未推送 1-推送中 2-已推送 3-推送失败',
    push_time DATETIME DEFAULT NULL COMMENT '推送时间',
    push_error VARCHAR(500) DEFAULT NULL COMMENT '推送错误信息',
    push_attempts INT DEFAULT 0 COMMENT '推送重试次数',
    sync_status TINYINT DEFAULT 0 COMMENT '同步状态: 0-未同步 1-已同步 2-同步失败',
    sync_attempts INT DEFAULT 0 COMMENT '同步重试次数',
    sync_error VARCHAR(500) DEFAULT NULL COMMENT '同步错误信息',
    sync_time DATETIME DEFAULT NULL COMMENT '同步时间',
    scanned_count INT DEFAULT 0 COMMENT '被扫码次数',
    last_scanned_time DATETIME DEFAULT NULL COMMENT '最后扫码时间',
    cashier_id BIGINT DEFAULT NULL COMMENT '开票收银员ID',
    cashier_name VARCHAR(50) DEFAULT NULL COMMENT '开票收银员姓名',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_invoice_no (invoice_no),
    UNIQUE KEY uk_qrcode_token (qrcode_token),
    KEY idx_order_id (order_id),
    KEY idx_order_no (order_no),
    KEY idx_invoice_status (invoice_status),
    KEY idx_tax_control_status (tax_control_status),
    KEY idx_sync_status (sync_status),
    KEY idx_push_status (push_status),
    KEY idx_buyer_phone (buyer_phone),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='电子发票表';

-- 顾客票夹表
DROP TABLE IF EXISTS invoice_wallet;
CREATE TABLE invoice_wallet (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    wallet_no VARCHAR(64) NOT NULL COMMENT '票夹记录编号',
    customer_identifier VARCHAR(128) NOT NULL COMMENT '顾客标识（手机号/OpenID等）',
    customer_type TINYINT DEFAULT 1 COMMENT '顾客类型: 1-手机号 2-微信OpenID 3-支付宝ID',
    customer_name VARCHAR(50) DEFAULT NULL COMMENT '顾客姓名',
    customer_phone VARCHAR(20) DEFAULT NULL COMMENT '顾客手机号',
    invoice_id BIGINT NOT NULL COMMENT '发票ID',
    invoice_no VARCHAR(64) NOT NULL COMMENT '发票编号',
    invoice_code VARCHAR(64) DEFAULT NULL COMMENT '发票代码',
    invoice_number VARCHAR(64) DEFAULT NULL COMMENT '发票号码',
    invoice_date DATETIME DEFAULT NULL COMMENT '开票日期',
    invoice_amount DECIMAL(12,2) DEFAULT 0.00 COMMENT '发票金额',
    buyer_name VARCHAR(200) DEFAULT NULL COMMENT '购方名称',
    shop_id BIGINT DEFAULT NULL COMMENT '门店ID',
    shop_name VARCHAR(100) DEFAULT NULL COMMENT '门店名称',
    scan_source TINYINT DEFAULT 1 COMMENT '扫码来源: 1-线下扫码 2-小程序 3-H5',
    scan_time DATETIME DEFAULT NULL COMMENT '扫码/存入时间',
    scan_device_info VARCHAR(500) DEFAULT NULL COMMENT '扫码设备信息',
    wallet_status TINYINT DEFAULT 1 COMMENT '票夹状态: 0-已删除 1-正常 2-已导出',
    is_read TINYINT DEFAULT 0 COMMENT '是否已读: 0-未读 1-已读',
    is_favorite TINYINT DEFAULT 0 COMMENT '是否收藏: 0-未收藏 1-已收藏',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    tags VARCHAR(200) DEFAULT NULL COMMENT '标签（逗号分隔）',
    sync_status TINYINT DEFAULT 0 COMMENT '同步状态: 0-未同步 1-已同步 2-同步失败',
    sync_time DATETIME DEFAULT NULL COMMENT '同步时间',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_wallet_no (wallet_no),
    UNIQUE KEY uk_customer_invoice (customer_identifier, invoice_id),
    KEY idx_customer_identifier (customer_identifier),
    KEY idx_invoice_id (invoice_id),
    KEY idx_invoice_no (invoice_no),
    KEY idx_scan_time (scan_time),
    KEY idx_wallet_status (wallet_status),
    KEY idx_sync_status (sync_status),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='顾客票夹表';

-- 初始用户角色关联数据
INSERT INTO sys_user_role (user_id, role_id, role_code, role_name, create_time, update_time) VALUES
(1, 1, 'admin', '管理员', NOW(), NOW()),
(2, 2, 'cashier', '收银员', NOW(), NOW());

INSERT INTO printer (printer_code, printer_name, printer_type, connection_type, ip_address, port, status, is_default, sort, create_time, update_time) VALUES
('KITCHEN_HOT', '热菜厨房打印机', 'kitchen', 'network', '192.168.1.101', 9100, 1, 0, 1, NOW(), NOW()),
('KITCHEN_COLD', '凉菜厨房打印机', 'kitchen', 'network', '192.168.1.102', 9100, 1, 0, 2, NOW(), NOW()),
('KITCHEN_DRINK', '饮品吧台打印机', 'kitchen', 'network', '192.168.1.103', 9100, 1, 0, 3, NOW(), NOW()),
('RECEIPT_MAIN', '收银前台打印机', 'receipt', 'usb', NULL, NULL, 1, 1, 4, NOW(), NOW());

INSERT INTO print_rule (rule_code, rule_name, category_id, category_name, printer_id, printer_code, copies, priority, sort, status, create_time, update_time) VALUES
('RULE_HOT', '热菜分单规则', 1, '热菜', 1, 'KITCHEN_HOT', 2, 10, 1, 1, NOW(), NOW()),
('RULE_COLD', '凉菜分单规则', 2, '凉菜', 2, 'KITCHEN_COLD', 1, 10, 2, 1, NOW(), NOW()),
('RULE_STAPLE', '主食分单规则', 3, '主食', 1, 'KITCHEN_HOT', 1, 5, 3, 1, NOW(), NOW()),
('RULE_DRINK', '饮品分单规则', 4, '饮品', 3, 'KITCHEN_DRINK', 1, 10, 4, 1, NOW(), NOW()),
('RULE_DESSERT', '甜品分单规则', 5, '甜品', 3, 'KITCHEN_DRINK', 1, 5, 5, 1, NOW(), NOW());

INSERT INTO print_template (template_code, template_name, template_type, paper_width, font_size, header, footer, is_default, status, create_time, update_time) VALUES
('TPL_KITCHEN_DEFAULT', '厨房小票默认模板', 'kitchen', 58, 12, '{shop_name}', '--- 厨房联 ---', 1, 1, NOW(), NOW()),
('TPL_RECEIPT_DEFAULT', '收银小票默认模板', 'receipt', 80, 12, '{shop_name}', '谢谢惠顾', 1, 1, NOW(), NOW());
