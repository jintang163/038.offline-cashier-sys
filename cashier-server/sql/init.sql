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

-- =============================================
-- 10. 会员等级表
-- =============================================
DROP TABLE IF EXISTS member_level;
CREATE TABLE member_level (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    erp_level_id VARCHAR(64) DEFAULT NULL COMMENT 'ERP等级ID',
    level_code VARCHAR(32) NOT NULL COMMENT '等级编码',
    level_name VARCHAR(50) NOT NULL COMMENT '等级名称',
    min_points INT DEFAULT 0 COMMENT '最低积分',
    max_points INT DEFAULT NULL COMMENT '最高积分',
    discount_rate DECIMAL(5,2) DEFAULT 100.00 COMMENT '折扣率(%) 100=无折扣',
    point_rate DECIMAL(5,2) DEFAULT 1.00 COMMENT '积分倍率',
    sort_order INT DEFAULT 0 COMMENT '排序',
    status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-正常',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_level_code (level_code),
    KEY idx_erp_level_id (erp_level_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员等级表';

-- =============================================
-- 11. 会员表
-- =============================================
DROP TABLE IF EXISTS member;
CREATE TABLE member (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    erp_member_id VARCHAR(64) DEFAULT NULL COMMENT 'ERP会员ID',
    phone VARCHAR(20) NOT NULL COMMENT '手机号',
    card_no VARCHAR(32) DEFAULT NULL COMMENT '会员卡号',
    member_name VARCHAR(50) DEFAULT NULL COMMENT '会员姓名',
    nickname VARCHAR(50) DEFAULT NULL COMMENT '昵称',
    avatar VARCHAR(255) DEFAULT NULL COMMENT '头像',
    gender TINYINT DEFAULT 0 COMMENT '性别: 0-未知 1-男 2-女',
    birthday DATE DEFAULT NULL COMMENT '生日',
    email VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
    address VARCHAR(500) DEFAULT NULL COMMENT '地址',
    level_id BIGINT DEFAULT NULL COMMENT '会员等级ID',
    level_name VARCHAR(50) DEFAULT NULL COMMENT '等级名称(冗余)',
    discount_rate DECIMAL(5,2) DEFAULT 100.00 COMMENT '折扣率(%)',
    points INT DEFAULT 0 COMMENT '当前积分',
    total_points INT DEFAULT 0 COMMENT '累计积分',
    balance DECIMAL(12,2) DEFAULT 0.00 COMMENT '账户余额',
    total_recharge DECIMAL(12,2) DEFAULT 0.00 COMMENT '累计充值',
    total_consume DECIMAL(12,2) DEFAULT 0.00 COMMENT '累计消费',
    total_orders INT DEFAULT 0 COMMENT '累计订单数',
    register_time DATETIME DEFAULT NULL COMMENT '注册时间',
    register_store BIGINT DEFAULT NULL COMMENT '注册门店',
    source_type TINYINT DEFAULT 1 COMMENT '来源: 1-本系统 2-ERP同步 3-小程序 4-其他',
    status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用 1-正常 2-冻结',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    last_used_time DATETIME DEFAULT NULL COMMENT '最后使用时间',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_phone (phone),
    UNIQUE KEY uk_card_no (card_no),
    KEY idx_erp_member_id (erp_member_id),
    KEY idx_level_id (level_id),
    KEY idx_birthday (birthday),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员表';

-- =============================================
-- 12. 会员储值卡表
-- =============================================
DROP TABLE IF EXISTS member_card;
CREATE TABLE member_card (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    erp_card_id VARCHAR(64) DEFAULT NULL COMMENT 'ERP卡ID',
    card_no VARCHAR(32) NOT NULL COMMENT '卡号',
    member_id BIGINT DEFAULT NULL COMMENT '会员ID',
    card_type TINYINT DEFAULT 1 COMMENT '卡类型: 1-储值卡 2-信用卡 3-礼品卡 4-会员卡',
    card_name VARCHAR(50) DEFAULT NULL COMMENT '卡名称',
    balance DECIMAL(12,2) DEFAULT 0.00 COMMENT '账户余额',
    reserved_balance DECIMAL(12,2) DEFAULT 0.00 COMMENT '预授权冻结金额',
    credit_limit DECIMAL(12,2) DEFAULT 0.00 COMMENT '离线预授权额度',
    used_credit DECIMAL(12,2) DEFAULT 0.00 COMMENT '已使用预授权额度',
    initial_balance DECIMAL(12,2) DEFAULT 0.00 COMMENT '初始金额',
    total_recharge DECIMAL(12,2) DEFAULT 0.00 COMMENT '累计充值',
    total_consume DECIMAL(12,2) DEFAULT 0.00 COMMENT '累计消费',
    valid_start_date DATE DEFAULT NULL COMMENT '有效期开始',
    valid_end_date DATE DEFAULT NULL COMMENT '有效期结束',
    issue_time DATETIME DEFAULT NULL COMMENT '发卡时间',
    issue_store BIGINT DEFAULT NULL COMMENT '发卡门店',
    password VARCHAR(100) DEFAULT NULL COMMENT '支付密码(加密)',
    status TINYINT DEFAULT 1 COMMENT '状态: 0-未激活 1-正常 2-冻结 3-注销 4-过期',
    last_used_time DATETIME DEFAULT NULL COMMENT '最后使用时间',
    last_sync_time DATETIME DEFAULT NULL COMMENT '最后同步时间',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_card_no (card_no),
    KEY idx_erp_card_id (erp_card_id),
    KEY idx_member_id (member_id),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员储值卡表';

-- =============================================
-- 13. 积分规则表
-- =============================================
DROP TABLE IF EXISTS point_rule;
CREATE TABLE point_rule (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    rule_code VARCHAR(32) NOT NULL COMMENT '规则编码',
    rule_name VARCHAR(100) NOT NULL COMMENT '规则名称',
    rule_type TINYINT NOT NULL COMMENT '规则类型: 1-每N元1积分 2-每元N积分 3-固定积分 4-等级倍率积分',
    rule_value DECIMAL(12,4) NOT NULL COMMENT '规则值',
    min_amount DECIMAL(12,2) DEFAULT NULL COMMENT '最小消费金额',
    max_amount DECIMAL(12,2) DEFAULT NULL COMMENT '最大消费金额',
    applicable_levels VARCHAR(255) DEFAULT NULL COMMENT '适用等级ID列表(逗号分隔)',
    exclude_products VARCHAR(500) DEFAULT NULL COMMENT '排除商品ID(逗号分隔)',
    exclude_categories VARCHAR(255) DEFAULT NULL COMMENT '排除分类ID(逗号分隔)',
    start_date DATETIME DEFAULT NULL COMMENT '生效开始时间',
    end_date DATETIME DEFAULT NULL COMMENT '生效结束时间',
    priority INT DEFAULT 0 COMMENT '优先级 数值越大越优先',
    stackable TINYINT DEFAULT 1 COMMENT '是否可叠加: 0-否 1-是',
    status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用 1-启用',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_rule_code (rule_code),
    KEY idx_status (status),
    KEY idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='积分规则表';

-- =============================================
-- 14. 积分变动记录表
-- =============================================
DROP TABLE IF EXISTS point_record;
CREATE TABLE point_record (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    record_no VARCHAR(32) NOT NULL COMMENT '流水号',
    member_id BIGINT NOT NULL COMMENT '会员ID',
    phone VARCHAR(20) DEFAULT NULL COMMENT '手机号(冗余)',
    change_type TINYINT NOT NULL COMMENT '变动类型: 1-获得 2-扣减 3-过期 4-调整 5-兑换 6-退款返还',
    change_points INT NOT NULL COMMENT '变动积分(正数获得,负数扣减)',
    before_points INT NOT NULL COMMENT '变动前积分',
    after_points INT NOT NULL COMMENT '变动后积分',
    order_no VARCHAR(32) DEFAULT NULL COMMENT '关联订单号',
    order_id BIGINT DEFAULT NULL COMMENT '关联订单ID',
    source_type TINYINT DEFAULT 1 COMMENT '来源: 1-消费赠送 2-积分抵扣 3-手动调整 4-活动赠送 5-过期清理 6-退款',
    rule_id BIGINT DEFAULT NULL COMMENT '积分规则ID',
    related_amount DECIMAL(12,2) DEFAULT NULL COMMENT '关联金额(消费金额等)',
    cashier_id BIGINT DEFAULT NULL COMMENT '操作人ID',
    cashier_name VARCHAR(50) DEFAULT NULL COMMENT '操作人姓名',
    store_id BIGINT DEFAULT NULL COMMENT '门店ID',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    sync_status TINYINT DEFAULT 0 COMMENT '同步ERP状态: 0-未同步 1-已同步 2-同步失败',
    sync_attempts INT DEFAULT 0 COMMENT '同步重试次数',
    sync_error VARCHAR(500) DEFAULT NULL COMMENT '同步错误信息',
    sync_time DATETIME DEFAULT NULL COMMENT '同步时间',
    expired_date DATE DEFAULT NULL COMMENT '过期日期(针对获得积分)',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_record_no (record_no),
    KEY idx_member_id (member_id),
    KEY idx_order_no (order_no),
    KEY idx_change_type (change_type),
    KEY idx_create_time (create_time),
    KEY idx_sync_status (sync_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='积分变动记录表';

-- =============================================
-- 15. 储值卡交易记录表
-- =============================================
DROP TABLE IF EXISTS member_card_record;
CREATE TABLE member_card_record (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    record_no VARCHAR(32) NOT NULL COMMENT '流水号',
    card_id BIGINT NOT NULL COMMENT '储值卡ID',
    card_no VARCHAR(32) DEFAULT NULL COMMENT '卡号(冗余)',
    member_id BIGINT DEFAULT NULL COMMENT '会员ID(冗余)',
    trade_type TINYINT NOT NULL COMMENT '交易类型: 1-充值 2-消费 3-退款 4-预授权 5-预授权完成 6-预授权取消 7-转账 8-调整',
    trade_amount DECIMAL(12,2) NOT NULL COMMENT '交易金额(正数充值/收入,负数消费/支出)',
    before_balance DECIMAL(12,2) NOT NULL COMMENT '交易前余额',
    after_balance DECIMAL(12,2) NOT NULL COMMENT '交易后余额',
    before_reserved DECIMAL(12,2) DEFAULT 0.00 COMMENT '交易前预授权',
    after_reserved DECIMAL(12,2) DEFAULT 0.00 COMMENT '交易后预授权',
    order_no VARCHAR(32) DEFAULT NULL COMMENT '关联订单号',
    order_id BIGINT DEFAULT NULL COMMENT '关联订单ID',
    related_record_no VARCHAR(32) DEFAULT NULL COMMENT '关联流水号(如预授权号)',
    cashier_id BIGINT DEFAULT NULL COMMENT '操作人ID',
    cashier_name VARCHAR(50) DEFAULT NULL COMMENT '操作人姓名',
    store_id BIGINT DEFAULT NULL COMMENT '门店ID',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    sync_status TINYINT DEFAULT 0 COMMENT '同步状态',
    sync_attempts INT DEFAULT 0 COMMENT '同步重试次数',
    sync_error VARCHAR(500) DEFAULT NULL COMMENT '同步错误',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_record_no (record_no),
    KEY idx_card_id (card_id),
    KEY idx_member_id (member_id),
    KEY idx_order_no (order_no),
    KEY idx_trade_type (trade_type),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='储值卡交易记录表';

-- =============================================
-- 初始化会员等级数据
-- =============================================
INSERT INTO member_level (level_code, level_name, min_points, max_points, discount_rate, point_rate, sort_order, status) VALUES
('LV1', '普通会员', 0, 999, 100.00, 1.00, 1, 1),
('LV2', '银卡会员', 1000, 4999, 95.00, 1.20, 2, 1),
('LV3', '金卡会员', 5000, 19999, 90.00, 1.50, 3, 1),
('LV4', '钻石会员', 20000, NULL, 85.00, 2.00, 4, 1);

-- =============================================
-- 初始化积分规则
-- =============================================
INSERT INTO point_rule (rule_code, rule_name, rule_type, rule_value, min_amount, priority, stackable, status, remark) VALUES
('BASE_POINT', '基础积分(每1元1积分)', 2, 1.00, 0.01, 0, 1, 1, '消费每满1元赠送1积分'),
('LV_RATE_POINT', '等级倍率积分', 4, 1.00, 0.01, 10, 1, 1, '按会员等级倍率计算积分'),
('BIG_ORDER_BONUS', '大额消费额外积分', 3, 100, 500.00, 5, 1, 1, '单笔消费满500元额外赠送100积分');

-- =============================================
-- 初始化测试会员数据
-- =============================================
INSERT INTO member (erp_member_id, phone, card_no, member_name, gender, birthday, level_id, level_name, discount_rate, points, total_points, balance, total_consume, total_orders, register_time, source_type, status) VALUES
('ERP001', '13800138001', 'VIP8880001', '张三', 1, '1990-06-15', 3, '金卡会员', 90.00, 8500, 12000, 500.00, 3500.00, 25, NOW(), 1, 1),
('ERP002', '13800138002', 'VIP8880002', '李四', 2, '1995-12-20', 2, '银卡会员', 95.00, 3200, 4500, 200.00, 1800.00, 12, NOW(), 1, 1),
('ERP003', '13800138003', 'VIP8880003', '王五', 1, '1988-03-08', 4, '钻石会员', 85.00, 25600, 30000, 2000.00, 15000.00, 68, NOW(), 1, 1),
('ERP004', '13800138004', 'VIP8880004', '赵六', 0, NULL, 1, '普通会员', 100.00, 500, 500, 0.00, 300.00, 5, NOW(), 1, 1);

-- =============================================
-- 初始化测试储值卡数据
-- =============================================
INSERT INTO member_card (erp_card_id, card_no, member_id, card_type, card_name, balance, reserved_balance, credit_limit, initial_balance, total_recharge, total_consume, issue_time, status, last_sync_time) VALUES
('EC001', 'CARD100001', 1, 1, '金卡储值卡', 500.00, 0.00, 500.00, 1000.00, 1000.00, 500.00, NOW(), 1, NOW()),
('EC002', 'CARD100002', 2, 1, '银卡储值卡', 200.00, 0.00, 200.00, 500.00, 500.00, 300.00, NOW(), 1, NOW()),
('EC003', 'CARD100003', 3, 1, '钻石储值卡', 2000.00, 0.00, 2000.00, 5000.00, 5000.00, 3000.00, NOW(), 1, NOW());

-- =============================================
-- 16. 营业日报表
-- =============================================
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

-- =============================================
-- 17. 退款单表
-- =============================================
DROP TABLE IF EXISTS refund_order;
CREATE TABLE refund_order (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    refund_no VARCHAR(32) NOT NULL COMMENT '退款单号',
    erp_refund_id VARCHAR(64) DEFAULT NULL COMMENT 'ERP退款单ID',
    order_id BIGINT NOT NULL COMMENT '原订单ID',
    order_no VARCHAR(32) NOT NULL COMMENT '原订单编号',
    erp_order_id VARCHAR(64) DEFAULT NULL COMMENT '原ERP订单ID',
    refund_type TINYINT NOT NULL DEFAULT 1 COMMENT '退款类型: 1-部分退款 2-整单退款',
    refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '退款金额',
    original_pay_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '原订单实付金额',
    refund_reason VARCHAR(500) DEFAULT NULL COMMENT '退款原因',
    audit_status TINYINT NOT NULL DEFAULT 0 COMMENT '审核状态: 0-待审核 1-审核通过 2-审核拒绝',
    auditor_id BIGINT DEFAULT NULL COMMENT '审核人ID',
    auditor_name VARCHAR(50) DEFAULT NULL COMMENT '审核人姓名',
    audit_time DATETIME DEFAULT NULL COMMENT '审核时间',
    audit_remark VARCHAR(500) DEFAULT NULL COMMENT '审核备注',
    sync_status TINYINT DEFAULT 0 COMMENT '同步状态: 0-未同步 1-已同步 2-同步失败',
    sync_attempts INT DEFAULT 0 COMMENT '同步重试次数',
    sync_error_message VARCHAR(500) DEFAULT NULL COMMENT '同步错误信息',
    sync_time DATETIME DEFAULT NULL COMMENT '同步时间',
    erp_push_status TINYINT DEFAULT 0 COMMENT 'ERP推送状态: 0-未推送 1-已推送 2-推送失败',
    erp_push_error VARCHAR(500) DEFAULT NULL COMMENT 'ERP推送错误',
    erp_push_time DATETIME DEFAULT NULL COMMENT 'ERP推送时间',
    cashier_id BIGINT DEFAULT NULL COMMENT '操作收银员ID',
    cashier_name VARCHAR(50) DEFAULT NULL COMMENT '操作收银员姓名',
    manager_id BIGINT DEFAULT NULL COMMENT '授权经理ID',
    manager_name VARCHAR(50) DEFAULT NULL COMMENT '授权经理姓名',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_refund_no (refund_no),
    KEY idx_order_id (order_id),
    KEY idx_order_no (order_no),
    KEY idx_audit_status (audit_status),
    KEY idx_sync_status (sync_status),
    KEY idx_erp_push_status (erp_push_status),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='退款单表';

-- =============================================
-- 18. 退款单明细表
-- =============================================
DROP TABLE IF EXISTS refund_order_item;
CREATE TABLE refund_order_item (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    refund_order_id BIGINT NOT NULL COMMENT '退款单ID',
    refund_no VARCHAR(32) NOT NULL COMMENT '退款单号',
    order_item_id BIGINT NOT NULL COMMENT '原订单明细ID',
    product_id BIGINT NOT NULL COMMENT '商品ID',
    erp_goods_id VARCHAR(64) DEFAULT NULL COMMENT 'ERP商品ID',
    product_name VARCHAR(200) NOT NULL COMMENT '商品名称',
    barcode VARCHAR(50) DEFAULT NULL COMMENT '条形码',
    image VARCHAR(255) DEFAULT NULL COMMENT '商品图片',
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '单价',
    original_quantity INT NOT NULL DEFAULT 0 COMMENT '原购买数量',
    refund_quantity INT NOT NULL DEFAULT 0 COMMENT '退款数量',
    original_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '原购买金额',
    refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '退款金额',
    discount_amount DECIMAL(12,2) DEFAULT 0.00 COMMENT '优惠金额',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除 1-已删除',
    PRIMARY KEY (id),
    KEY idx_refund_order_id (refund_order_id),
    KEY idx_refund_no (refund_no),
    KEY idx_order_item_id (order_item_id),
    KEY idx_product_id (product_id),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='退款单明细表';

-- =============================================
-- 19. 收银设备表
-- =============================================
DROP TABLE IF EXISTS cashier_device;
CREATE TABLE cashier_device (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    device_no VARCHAR(64) NOT NULL COMMENT '设备编号',
    device_name VARCHAR(100) DEFAULT NULL COMMENT '设备名称',
    device_type VARCHAR(20) NOT NULL DEFAULT 'cashier' COMMENT '设备类型: cashier-主收银机, backup-备用iPad, tablet-平板',
    device_model VARCHAR(100) DEFAULT NULL COMMENT '设备型号',
    os_type VARCHAR(20) DEFAULT NULL COMMENT '操作系统: Windows, macOS, iOS, Android',
    os_version VARCHAR(50) DEFAULT NULL COMMENT '系统版本',
    app_version VARCHAR(50) DEFAULT NULL COMMENT 'App版本',
    ip_address VARCHAR(50) DEFAULT NULL COMMENT 'IP地址',
    mac_address VARCHAR(50) DEFAULT NULL COMMENT 'MAC地址',
    location VARCHAR(200) DEFAULT NULL COMMENT '设备位置',
    device_status TINYINT NOT NULL DEFAULT 1 COMMENT '设备状态: 0-离线 1-在线 2-故障 3-备用',
    last_heartbeat DATETIME DEFAULT NULL COMMENT '最后心跳时间',
    last_login_time DATETIME DEFAULT NULL COMMENT '最后登录时间',
    last_login_user_id BIGINT DEFAULT NULL COMMENT '最后登录用户ID',
    last_login_user_name VARCHAR(50) DEFAULT NULL COMMENT '最后登录用户名',
    is_active TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用: 0-禁用 1-启用',
    is_main_device TINYINT NOT NULL DEFAULT 0 COMMENT '是否主设备: 0-否 1-是',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    sync_status TINYINT DEFAULT 0 COMMENT '同步状态: 0-未同步 1-已同步 2-同步失败',
    sync_time DATETIME DEFAULT NULL COMMENT '同步时间',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_device_no (device_no),
    KEY idx_device_type (device_type),
    KEY idx_device_status (device_status),
    KEY idx_is_main_device (is_main_device),
    KEY idx_last_heartbeat (last_heartbeat),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收银设备表';

-- =============================================
-- 20. 灾备扫码登录Token表
-- =============================================
DROP TABLE IF EXISTS disaster_recovery_token;
CREATE TABLE disaster_recovery_token (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    token VARCHAR(64) NOT NULL COMMENT '灾备登录Token',
    shop_id BIGINT DEFAULT NULL COMMENT '门店ID',
    shop_name VARCHAR(100) DEFAULT NULL COMMENT '门店名称',
    main_device_id BIGINT NOT NULL COMMENT '主设备ID',
    main_device_no VARCHAR(64) NOT NULL COMMENT '主设备编号',
    main_device_name VARCHAR(100) DEFAULT NULL COMMENT '主设备名称',
    main_device_ip VARCHAR(50) DEFAULT NULL COMMENT '主设备IP（局域网同步用）',
    operator_id BIGINT NOT NULL COMMENT '创建人ID',
    operator_name VARCHAR(50) NOT NULL COMMENT '创建人姓名',
    expire_time DATETIME NOT NULL COMMENT '过期时间',
    token_status TINYINT NOT NULL DEFAULT 0 COMMENT 'Token状态: 0-待使用 1-已使用 2-已过期 3-已撤销',
    used_time DATETIME DEFAULT NULL COMMENT '使用时间',
    used_device_id BIGINT DEFAULT NULL COMMENT '使用设备ID',
    used_device_no VARCHAR(64) DEFAULT NULL COMMENT '使用设备编号',
    backup_user_id BIGINT DEFAULT NULL COMMENT '备用端登录用户ID',
    backup_user_name VARCHAR(50) DEFAULT NULL COMMENT '备用端登录用户名',
    data_sync_status TINYINT DEFAULT 0 COMMENT '数据同步状态: 0-未同步 1-同步中 2-同步完成 3-同步失败',
    data_sync_time DATETIME DEFAULT NULL COMMENT '数据同步完成时间',
    data_hours INT NOT NULL DEFAULT 1 COMMENT '同步最近N小时数据',
    sync_scope VARCHAR(200) DEFAULT NULL COMMENT '同步范围: orders,products,members,stocks等逗号分隔',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_token (token),
    KEY idx_main_device_id (main_device_id),
    KEY idx_token_status (token_status),
    KEY idx_data_sync_status (data_sync_status),
    KEY idx_expire_time (expire_time),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='灾备扫码登录Token表';

-- =============================================
-- 初始化设备数据
-- =============================================
INSERT INTO cashier_device (device_no, device_name, device_type, device_model, os_type, app_version, device_status, is_main_device, is_active, remark, create_time) VALUES
('DEV-MAIN-001', '主收银机-前台', 'cashier', 'PC-Desktop', 'Windows', '1.0.0', 1, 1, 1, '主收银机，默认启用', NOW()),
('DEV-BACKUP-001', '备用iPad-01', 'backup', 'iPad Pro 12.9', 'iOS', '1.0.0', 3, 0, 1, '备用iPad，灾备使用', NOW()),
('DEV-BACKUP-002', '备用iPad-02', 'backup', 'iPad Air', 'iOS', '1.0.0', 3, 0, 1, '备用iPad，灾备使用', NOW());

-- =============================================
-- AI反欺诈监测 - 检测规则表
-- =============================================
CREATE TABLE fraud_detection_rule (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    rule_code VARCHAR(50) NOT NULL COMMENT '规则编码',
    rule_name VARCHAR(100) NOT NULL COMMENT '规则名称',
    rule_type VARCHAR(30) NOT NULL COMMENT '规则类型: REFUND_FREQUENCY-高频退款, REFUND_AMOUNT-大额退款, ABNORMAL_DISCOUNT-异常折扣',
    threshold_value DECIMAL(12,2) NOT NULL COMMENT '阈值',
    threshold_unit VARCHAR(20) NOT NULL COMMENT '阈值单位: TIMES-次数, AMOUNT-金额, PERCENT-百分比, MINUTES-分钟',
    time_window INT DEFAULT 60 COMMENT '时间窗口(分钟)',
    risk_level INT DEFAULT 1 COMMENT '风险等级: 1-低, 2-中, 3-高',
    lock_operation TINYINT DEFAULT 0 COMMENT '是否锁定操作: 0-否, 1-是',
    require_online_verify TINYINT DEFAULT 1 COMMENT '是否需要联网验证: 0-否, 1-是',
    status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
    remark VARCHAR(500) COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_rule_code (rule_code),
    KEY idx_rule_type (rule_type),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='反欺诈检测规则表';

-- =============================================
-- AI反欺诈监测 - 可疑门店表
-- =============================================
CREATE TABLE suspicious_store (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT NOT NULL COMMENT '门店ID',
    store_name VARCHAR(100) NOT NULL COMMENT '门店名称',
    risk_score INT DEFAULT 0 COMMENT '风险评分(0-100)',
    risk_level VARCHAR(20) DEFAULT 'LOW' COMMENT '风险等级: LOW-低, MEDIUM-中, HIGH-高, CRITICAL-严重',
    detection_count INT DEFAULT 0 COMMENT '检测次数',
    last_detection_time DATETIME COMMENT '最后检测时间',
    status VARCHAR(20) DEFAULT 'PENDING' COMMENT '状态: PENDING-待处理, INVESTIGATING-调查中, CONFIRMED-已确认, RESOLVED-已解决, DISMISSED-已忽略',
    handler_id BIGINT COMMENT '处理人ID',
    handler_name VARCHAR(50) COMMENT '处理人',
    handle_time DATETIME COMMENT '处理时间',
    handle_remark VARCHAR(500) COMMENT '处理备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_store_id (store_id),
    KEY idx_risk_level (risk_level),
    KEY idx_status (status),
    KEY idx_risk_score (risk_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='可疑门店表';

-- =============================================
-- AI反欺诈监测 - 操作锁定日志表
-- =============================================
CREATE TABLE operation_lock_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    lock_no VARCHAR(50) NOT NULL COMMENT '锁定编号',
    store_id BIGINT COMMENT '门店ID',
    store_name VARCHAR(100) COMMENT '门店名称',
    device_id BIGINT COMMENT '设备ID',
    device_no VARCHAR(50) COMMENT '设备编号',
    cashier_id BIGINT COMMENT '收银员ID',
    cashier_name VARCHAR(50) COMMENT '收银员',
    operation_type VARCHAR(30) NOT NULL COMMENT '操作类型: REFUND-退款, DISCOUNT-折扣',
    trigger_rule VARCHAR(100) COMMENT '触发规则',
    risk_level INT DEFAULT 1 COMMENT '风险等级: 1-低, 2-中, 3-高',
    lock_reason VARCHAR(500) COMMENT '锁定原因',
    lock_details JSON COMMENT '锁定详情(JSON)',
    is_offline TINYINT DEFAULT 1 COMMENT '是否离线触发: 0-否, 1-是',
    verify_status TINYINT DEFAULT 0 COMMENT '验证状态: 0-待验证, 1-验证通过, 2-验证失败, 3-已取消',
    verify_user_id BIGINT COMMENT '验证人ID',
    verify_user_name VARCHAR(50) COMMENT '验证人',
    verify_time DATETIME COMMENT '验证时间',
    verify_remark VARCHAR(500) COMMENT '验证备注',
    sync_status TINYINT DEFAULT 0 COMMENT '同步状态: 0-待同步, 1-已同步',
    sync_time DATETIME COMMENT '同步时间',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_lock_no (lock_no),
    KEY idx_store_id (store_id),
    KEY idx_operation_type (operation_type),
    KEY idx_verify_status (verify_status),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作锁定日志表';

-- =============================================
-- AI反欺诈监测 - 风险告警表
-- =============================================
CREATE TABLE fraud_alert (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    alert_no VARCHAR(50) NOT NULL COMMENT '告警编号',
    store_id BIGINT COMMENT '门店ID',
    store_name VARCHAR(100) COMMENT '门店名称',
    device_id BIGINT COMMENT '设备ID',
    device_no VARCHAR(50) COMMENT '设备编号',
    alert_type VARCHAR(30) NOT NULL COMMENT '告警类型: REFUND_FREQUENCY-高频退款, REFUND_AMOUNT-大额退款, ABNORMAL_DISCOUNT-异常折扣, SUSPICIOUS_STORE-可疑门店',
    risk_level INT DEFAULT 1 COMMENT '风险等级: 1-低, 2-中, 3-高',
    alert_title VARCHAR(200) NOT NULL COMMENT '告警标题',
    alert_content TEXT COMMENT '告警内容',
    alert_details JSON COMMENT '告警详情(JSON)',
    status VARCHAR(20) DEFAULT 'NEW' COMMENT '状态: NEW-新建, ACKNOWLEDGED-已确认, PROCESSING-处理中, RESOLVED-已解决, CLOSED-已关闭',
    assignee_id BIGINT COMMENT '指派人ID',
    assignee_name VARCHAR(50) COMMENT '指派人',
    resolve_time DATETIME COMMENT '解决时间',
    resolve_remark VARCHAR(500) COMMENT '解决备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_alert_no (alert_no),
    KEY idx_store_id (store_id),
    KEY idx_alert_type (alert_type),
    KEY idx_risk_level (risk_level),
    KEY idx_status (status),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='风险告警表';

-- =============================================
-- 初始化反欺诈检测规则
-- =============================================
INSERT INTO fraud_detection_rule (rule_code, rule_name, rule_type, threshold_value, threshold_unit, time_window, risk_level, lock_operation, require_online_verify, status, remark) VALUES
('RULE-REFUND-FREQ-001', '15分钟内退款超过5次', 'REFUND_FREQUENCY', 5, 'TIMES', 15, 2, 1, 1, 1, '15分钟内退款次数超过5次触发警告'),
('RULE-REFUND-FREQ-002', '1小时内退款超过10次', 'REFUND_FREQUENCY', 10, 'TIMES', 60, 3, 1, 1, 1, '1小时内退款次数超过10次触发高风险'),
('RULE-REFUND-AMT-001', '单笔退款超过500元', 'REFUND_AMOUNT', 500, 'AMOUNT', 1, 2, 1, 1, 1, '单笔退款金额超过500元'),
('RULE-REFUND-AMT-002', '单笔退款超过2000元', 'REFUND_AMOUNT', 2000, 'AMOUNT', 1, 3, 1, 1, 1, '单笔退款金额超过2000元，高风险'),
('RULE-REFUND-AMT-003', '1小时内累计退款超过3000元', 'REFUND_AMOUNT', 3000, 'AMOUNT', 60, 3, 1, 1, 1, '1小时内累计退款金额超过3000元'),
('RULE-DISCOUNT-001', '折扣低于7折', 'ABNORMAL_DISCOUNT', 70, 'PERCENT', 1, 2, 1, 1, 1, '订单折扣低于7折（70%）'),
('RULE-DISCOUNT-002', '折扣低于5折', 'ABNORMAL_DISCOUNT', 50, 'PERCENT', 1, 3, 1, 1, 1, '订单折扣低于5折（50%），高风险'),
('RULE-DISCOUNT-003', '1小时内3单以上低于8折', 'ABNORMAL_DISCOUNT', 3, 'TIMES', 60, 2, 1, 1, 1, '1小时内3单及以上折扣低于8折');

-- =============================================
-- 21. 设备自检记录表
-- =============================================
DROP TABLE IF EXISTS device_self_check_log;
CREATE TABLE device_self_check_log (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    check_no VARCHAR(64) NOT NULL COMMENT '自检编号',
    device_id BIGINT DEFAULT NULL COMMENT '设备ID',
    device_no VARCHAR(64) DEFAULT NULL COMMENT '设备编号',
    device_name VARCHAR(100) DEFAULT NULL COMMENT '设备名称',
    check_type VARCHAR(32) NOT NULL COMMENT '检查类型: NETWORK-网络, PRINTER-打印机, STORAGE-存储, FULL-全面',
    check_status TINYINT NOT NULL DEFAULT 0 COMMENT '检查状态: 0-待检查 1-检查中 2-检查通过 3-检查异常',
    network_status TINYINT DEFAULT NULL COMMENT '网络状态: 0-离线 1-在线',
    network_latency INT DEFAULT NULL COMMENT '网络延迟(ms)',
    network_speed VARCHAR(50) DEFAULT NULL COMMENT '网络速度',
    printer_status TINYINT DEFAULT NULL COMMENT '打印机状态: 0-离线 1-在线 2-缺纸 3-故障',
    printer_name VARCHAR(100) DEFAULT NULL COMMENT '打印机名称',
    printer_error VARCHAR(500) DEFAULT NULL COMMENT '打印机错误信息',
    storage_total BIGINT DEFAULT NULL COMMENT '存储总量(字节)',
    storage_used BIGINT DEFAULT NULL COMMENT '已用存储(字节)',
    storage_free BIGINT DEFAULT NULL COMMENT '可用存储(字节)',
    storage_usage_rate DECIMAL(5,2) DEFAULT NULL COMMENT '存储使用率(%)',
    storage_status TINYINT DEFAULT NULL COMMENT '存储状态: 0-充足 1-警告 2-不足',
    error_details TEXT DEFAULT NULL COMMENT '异常详情(JSON)',
    is_alerted TINYINT DEFAULT 0 COMMENT '是否已告警: 0-否 1-是',
    alert_time DATETIME DEFAULT NULL COMMENT '告警时间',
    operator_id BIGINT DEFAULT NULL COMMENT '处理人ID',
    operator_name VARCHAR(50) DEFAULT NULL COMMENT '处理人',
    handle_status TINYINT DEFAULT 0 COMMENT '处理状态: 0-未处理 1-处理中 2-已处理',
    handle_remark VARCHAR(500) DEFAULT NULL COMMENT '处理备注',
    handle_time DATETIME DEFAULT NULL COMMENT '处理时间',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_check_no (check_no),
    KEY idx_device_id (device_id),
    KEY idx_device_no (device_no),
    KEY idx_check_type (check_type),
    KEY idx_check_status (check_status),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备自检记录表';

-- =============================================
-- 22. 设备日志上传记录表
-- =============================================
DROP TABLE IF EXISTS device_log_upload;
CREATE TABLE device_log_upload (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    upload_no VARCHAR(64) NOT NULL COMMENT '上传编号',
    device_id BIGINT DEFAULT NULL COMMENT '设备ID',
    device_no VARCHAR(64) DEFAULT NULL COMMENT '设备编号',
    device_name VARCHAR(100) DEFAULT NULL COMMENT '设备名称',
    log_date DATE NOT NULL COMMENT '日志日期',
    log_type VARCHAR(32) NOT NULL DEFAULT 'OPERATION' COMMENT '日志类型: OPERATION-操作日志, ERROR-错误日志, SYSTEM-系统日志, ALL-全部',
    file_name VARCHAR(255) NOT NULL COMMENT '文件名',
    file_path VARCHAR(500) DEFAULT NULL COMMENT 'MinIO文件路径',
    file_size BIGINT DEFAULT NULL COMMENT '文件大小(字节)',
    file_md5 VARCHAR(64) DEFAULT NULL COMMENT '文件MD5校验',
    upload_status TINYINT NOT NULL DEFAULT 0 COMMENT '上传状态: 0-待上传 1-上传中 2-上传成功 3-上传失败',
    upload_attempts INT DEFAULT 0 COMMENT '上传重试次数',
    upload_error VARCHAR(500) DEFAULT NULL COMMENT '上传错误信息',
    upload_time DATETIME DEFAULT NULL COMMENT '上传完成时间',
    operator_id BIGINT DEFAULT NULL COMMENT '拉取人ID',
    operator_name VARCHAR(50) DEFAULT NULL COMMENT '拉取人',
    pull_request_time DATETIME DEFAULT NULL COMMENT '远程拉取请求时间',
    pull_status TINYINT DEFAULT 0 COMMENT '远程拉取状态: 0-未请求 1-待拉取 2-拉取中 3-已拉取 4-拉取失败',
    pull_remark VARCHAR(500) DEFAULT NULL COMMENT '拉取备注',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_upload_no (upload_no),
    KEY idx_device_id (device_id),
    KEY idx_device_no (device_no),
    KEY idx_log_date (log_date),
    KEY idx_upload_status (upload_status),
    KEY idx_pull_status (pull_status),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备日志上传记录表';

