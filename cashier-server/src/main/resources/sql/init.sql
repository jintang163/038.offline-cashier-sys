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

-- 初始用户角色关联数据
INSERT INTO sys_user_role (user_id, role_id, role_code, role_name, create_time, update_time) VALUES
(1, 1, 'admin', '管理员', NOW(), NOW()),
(2, 2, 'cashier', '收银员', NOW(), NOW());
