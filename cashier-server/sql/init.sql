-- =============================================
-- 离线收银系统数据库初始化脚本
-- 数据库: MySQL 8.0
-- 创建日期: 2026-06-14
-- =============================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS cashier_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

USE cashier_db;

-- =============================================
-- 1. 用户表
-- =============================================
DROP TABLE IF EXISTS sys_user;
CREATE TABLE sys_user (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    username VARCHAR(50) NOT NULL COMMENT '用户名',
    password VARCHAR(100) NOT NULL COMMENT '密码',
    nickname VARCHAR(50) DEFAULT NULL COMMENT '昵称',
    avatar VARCHAR(255) DEFAULT NULL COMMENT '头像',
    phone VARCHAR(20) DEFAULT NULL COMMENT '手机号',
    email VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
    status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-正常',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除, 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_username (username),
    KEY idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统用户表';

-- =============================================
-- 2. 角色表
-- =============================================
DROP TABLE IF EXISTS sys_role;
CREATE TABLE sys_role (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    role_name VARCHAR(50) NOT NULL COMMENT '角色名称',
    role_code VARCHAR(50) NOT NULL COMMENT '角色编码',
    description VARCHAR(255) DEFAULT NULL COMMENT '角色描述',
    status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-正常',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除, 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_role_code (role_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统角色表';

-- =============================================
-- 3. 用户角色关联表
-- =============================================
DROP TABLE IF EXISTS sys_user_role;
CREATE TABLE sys_user_role (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    role_id BIGINT NOT NULL COMMENT '角色ID',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除, 1-已删除',
    PRIMARY KEY (id),
    KEY idx_user_id (user_id),
    KEY idx_role_id (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户角色关联表';

-- =============================================
-- 4. 商品分类表
-- =============================================
DROP TABLE IF EXISTS product_category;
CREATE TABLE product_category (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    category_name VARCHAR(100) NOT NULL COMMENT '分类名称',
    category_code VARCHAR(50) DEFAULT NULL COMMENT '分类编码',
    parent_id BIGINT DEFAULT 0 COMMENT '父分类ID',
    sort_order INT DEFAULT 0 COMMENT '排序',
    status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-正常',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除, 1-已删除',
    PRIMARY KEY (id),
    KEY idx_parent_id (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品分类表';

-- =============================================
-- 5. 商品表
-- =============================================
DROP TABLE IF EXISTS product;
CREATE TABLE product (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    product_name VARCHAR(200) NOT NULL COMMENT '商品名称',
    product_code VARCHAR(50) DEFAULT NULL COMMENT '商品编码',
    barcode VARCHAR(50) DEFAULT NULL COMMENT '条形码',
    category_id BIGINT DEFAULT NULL COMMENT '分类ID',
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '售价',
    cost_price DECIMAL(10,2) DEFAULT 0.00 COMMENT '成本价',
    stock INT DEFAULT 0 COMMENT '库存数量',
    unit VARCHAR(20) DEFAULT '件' COMMENT '单位',
    image VARCHAR(255) DEFAULT NULL COMMENT '商品图片',
    description TEXT DEFAULT NULL COMMENT '商品描述',
    status TINYINT DEFAULT 1 COMMENT '状态: 0-下架, 1-上架',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除, 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_product_code (product_code),
    KEY idx_barcode (barcode),
    KEY idx_category_id (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品表';

-- =============================================
-- 6. 订单表
-- =============================================
DROP TABLE IF EXISTS `order`;
CREATE TABLE `order` (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    order_no VARCHAR(32) NOT NULL COMMENT '订单编号',
    order_type TINYINT DEFAULT 1 COMMENT '订单类型: 1-正常订单, 2-退货订单',
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '订单总金额',
    discount_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '优惠金额',
    pay_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '实付金额',
    pay_type TINYINT DEFAULT 0 COMMENT '支付方式: 0-未支付, 1-现金, 2-微信, 3-支付宝, 4-银行卡',
    pay_status TINYINT DEFAULT 0 COMMENT '支付状态: 0-未支付, 1-已支付, 2-已退款',
    order_status TINYINT DEFAULT 1 COMMENT '订单状态: 0-已取消, 1-待支付, 2-已完成',
    cashier_id BIGINT DEFAULT NULL COMMENT '收银员ID',
    member_id BIGINT DEFAULT NULL COMMENT '会员ID',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除, 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_order_no (order_no),
    KEY idx_cashier_id (cashier_id),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- =============================================
-- 7. 订单明细表
-- =============================================
DROP TABLE IF EXISTS order_item;
CREATE TABLE order_item (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    order_id BIGINT NOT NULL COMMENT '订单ID',
    order_no VARCHAR(32) NOT NULL COMMENT '订单编号',
    product_id BIGINT NOT NULL COMMENT '商品ID',
    product_name VARCHAR(200) NOT NULL COMMENT '商品名称',
    product_code VARCHAR(50) DEFAULT NULL COMMENT '商品编码',
    barcode VARCHAR(50) DEFAULT NULL COMMENT '条形码',
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '单价',
    quantity INT NOT NULL DEFAULT 1 COMMENT '数量',
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '小计',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除, 1-已删除',
    PRIMARY KEY (id),
    KEY idx_order_id (order_id),
    KEY idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单明细表';

-- =============================================
-- 8. 支付记录表
-- =============================================
DROP TABLE IF EXISTS payment_record;
CREATE TABLE payment_record (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    order_id BIGINT NOT NULL COMMENT '订单ID',
    order_no VARCHAR(32) NOT NULL COMMENT '订单编号',
    pay_no VARCHAR(32) DEFAULT NULL COMMENT '支付流水号',
    pay_type TINYINT NOT NULL COMMENT '支付方式: 1-现金, 2-微信, 3-支付宝, 4-银行卡',
    pay_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '支付金额',
    pay_status TINYINT DEFAULT 0 COMMENT '支付状态: 0-待支付, 1-支付成功, 2-支付失败',
    pay_time DATETIME DEFAULT NULL COMMENT '支付时间',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除, 1-已删除',
    PRIMARY KEY (id),
    KEY idx_order_id (order_id),
    KEY idx_pay_no (pay_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付记录表';

-- =============================================
-- 9. 销售汇总表
-- =============================================
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

-- =============================================
-- 初始化数据
-- =============================================

-- 初始化管理员用户 (密码: 123456，MD5加密)
INSERT INTO sys_user (username, password, nickname, phone, status) VALUES
('admin', 'e10adc3949ba59abbe56e057f20f883e', '超级管理员', '13800138000', 1),
('cashier01', 'e10adc3949ba59abbe56e057f20f883e', '收银员01', '13800138001', 1);

-- 初始化角色
INSERT INTO sys_role (role_name, role_code, description, status) VALUES
('超级管理员', 'super_admin', '拥有所有权限', 1),
('收银员', 'cashier', '收银操作权限', 1),
('管理员', 'admin', '管理权限', 1);

-- 初始化用户角色关联
INSERT INTO sys_user_role (user_id, role_id) VALUES
(1, 1),
(2, 2);

-- 初始化商品分类
INSERT INTO product_category (category_name, category_code, parent_id, sort_order) VALUES
('饮料', 'drink', 0, 1),
('零食', 'snack', 0, 2),
('日用品', 'daily', 0, 3),
('碳酸饮料', 'soda', 1, 1),
('果汁饮料', 'juice', 1, 2),
('饼干糕点', 'biscuit', 2, 1),
('糖果巧克力', 'candy', 2, 2);

-- 初始化商品
INSERT INTO product (product_name, product_code, barcode, category_id, price, cost_price, stock, unit, status) VALUES
('可口可乐 330ml', 'P001', '6901234567890', 4, 3.50, 2.00, 100, '瓶', 1),
('百事可乐 330ml', 'P002', '6901234567891', 4, 3.50, 2.00, 100, '瓶', 1),
('农夫山泉 550ml', 'P003', '6901234567892', 5, 2.00, 0.80, 200, '瓶', 1),
('康师傅红烧牛肉面', 'P004', '6901234567893', 6, 5.00, 3.00, 50, '桶', 1),
('德芙巧克力', 'P005', '6901234567894', 7, 12.00, 8.00, 30, '盒', 1);
