-- =============================================
-- 多门店数据隔离与汇总 - 数据库增量脚本
-- 数据库: MySQL 8.0
-- 创建日期: 2026-06-17
-- =============================================

USE cashier_db;

-- =============================================
-- 1. 门店表
-- =============================================
DROP TABLE IF EXISTS store;
CREATE TABLE store (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    store_code VARCHAR(50) NOT NULL COMMENT '门店编码(唯一标识)',
    store_name VARCHAR(100) NOT NULL COMMENT '门店名称',
    store_type TINYINT DEFAULT 1 COMMENT '门店类型: 1-直营 2-加盟 3-联营',
    province VARCHAR(50) DEFAULT NULL COMMENT '省',
    city VARCHAR(50) DEFAULT NULL COMMENT '市',
    district VARCHAR(50) DEFAULT NULL COMMENT '区',
    address VARCHAR(500) DEFAULT NULL COMMENT '详细地址',
    contact_phone VARCHAR(20) DEFAULT NULL COMMENT '联系电话',
    contact_name VARCHAR(50) DEFAULT NULL COMMENT '联系人',
    business_hours VARCHAR(100) DEFAULT NULL COMMENT '营业时间',
    longitude DECIMAL(10,6) DEFAULT NULL COMMENT '经度',
    latitude DECIMAL(10,6) DEFAULT NULL COMMENT '纬度',
    erp_config_mode TINYINT DEFAULT 0 COMMENT 'ERP对接模式: 0-总部分发 1-独立配置',
    erp_config_id BIGINT DEFAULT NULL COMMENT '独立ERP配置ID(erp_config_mode=1时)',
    status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用 1-正常 2-装修中 3-已关闭',
    is_headquarters TINYINT DEFAULT 0 COMMENT '是否总部: 0-否 1-是',
    parent_store_id BIGINT DEFAULT NULL COMMENT '上级门店ID',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_store_code (store_code),
    KEY idx_status (status),
    KEY idx_is_headquarters (is_headquarters),
    KEY idx_parent_store_id (parent_store_id),
    KEY idx_erp_config_mode (erp_config_mode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='门店表';

-- =============================================
-- 2. 门店ERP配置表 (独立配置模式时使用)
-- =============================================
DROP TABLE IF EXISTS store_erp_config;
CREATE TABLE store_erp_config (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    store_id BIGINT NOT NULL COMMENT '门店ID',
    store_code VARCHAR(50) NOT NULL COMMENT '门店编码',
    erp_config_id BIGINT DEFAULT NULL COMMENT '关联erp_config表ID',
    erp_type VARCHAR(50) DEFAULT NULL COMMENT 'ERP类型',
    base_url VARCHAR(500) DEFAULT NULL COMMENT 'ERP接口地址',
    auth_type VARCHAR(30) DEFAULT NULL COMMENT '认证方式',
    app_key VARCHAR(200) DEFAULT NULL COMMENT 'AppKey',
    app_secret VARCHAR(200) DEFAULT NULL COMMENT 'AppSecret(加密存储)',
    token VARCHAR(500) DEFAULT NULL COMMENT 'Token(加密存储)',
    token_expire_time DATETIME DEFAULT NULL COMMENT 'Token过期时间',
    username VARCHAR(100) DEFAULT NULL COMMENT 'ERP用户名',
    password VARCHAR(200) DEFAULT NULL COMMENT 'ERP密码(加密存储)',
    timeout INT DEFAULT 30000 COMMENT '超时时间(ms)',
    retry_times INT DEFAULT 3 COMMENT '重试次数',
    retry_interval INT DEFAULT 5000 COMMENT '重试间隔(ms)',
    push_order_enabled TINYINT DEFAULT 1 COMMENT '是否推送订单: 0-否 1-是',
    push_stock_enabled TINYINT DEFAULT 1 COMMENT '是否推送库存变动: 0-否 1-是',
    push_daily_report_enabled TINYINT DEFAULT 1 COMMENT '是否推送日报: 0-否 1-是',
    push_member_enabled TINYINT DEFAULT 1 COMMENT '是否推送会员: 0-否 1-是',
    push_refund_enabled TINYINT DEFAULT 1 COMMENT '是否推送退款: 0-否 1-是',
    status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用 1-正常',
    last_sync_time DATETIME DEFAULT NULL COMMENT '最后同步时间',
    last_push_time DATETIME DEFAULT NULL COMMENT '最后推送时间',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_store_id (store_id),
    KEY idx_store_code (store_code),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='门店ERP配置表';

-- =============================================
-- 3. 门店同步状态汇总表 (总部监控用)
-- =============================================
DROP TABLE IF EXISTS store_sync_status;
CREATE TABLE store_sync_status (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    store_id BIGINT NOT NULL COMMENT '门店ID',
    store_code VARCHAR(50) NOT NULL COMMENT '门店编码',
    store_name VARCHAR(100) DEFAULT NULL COMMENT '门店名称',
    sync_type VARCHAR(50) NOT NULL COMMENT '同步类型: ORDER-订单, REFUND-退款, DAILY_REPORT-日报, INVOICE-发票, SALES_SUMMARY-销售汇总, MEMBER-会员, POINT_RECORD-积分, CARD_RECORD-会员卡, PRINT_HISTORY-打印, STOCK-库存',
    last_sync_time DATETIME DEFAULT NULL COMMENT '最后同步时间',
    last_sync_status TINYINT DEFAULT NULL COMMENT '最后同步状态: 0-未同步 1-已同步 2-同步失败',
    last_sync_error VARCHAR(500) DEFAULT NULL COMMENT '最后同步错误信息',
    unsynced_count INT DEFAULT 0 COMMENT '未同步数量',
    failed_count INT DEFAULT 0 COMMENT '同步失败数量',
    total_synced_count INT DEFAULT 0 COMMENT '累计同步成功数量',
    total_failed_count INT DEFAULT 0 COMMENT '累计同步失败数量',
    avg_sync_latency INT DEFAULT 0 COMMENT '平均同步延迟(ms)',
    is_online TINYINT DEFAULT 0 COMMENT '门店是否在线: 0-离线 1-在线',
    last_heartbeat_time DATETIME DEFAULT NULL COMMENT '最后心跳时间',
    erp_push_status TINYINT DEFAULT 0 COMMENT 'ERP推送状态: 0-未推送 1-已推送 2-推送失败',
    last_erp_push_time DATETIME DEFAULT NULL COMMENT '最后ERP推送时间',
    erp_push_error VARCHAR(500) DEFAULT NULL COMMENT 'ERP推送错误',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_store_sync_type (store_id, sync_type),
    KEY idx_store_code (store_code),
    KEY idx_sync_type (sync_type),
    KEY idx_last_sync_status (last_sync_status),
    KEY idx_is_online (is_online),
    KEY idx_update_time (update_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='门店同步状态汇总表';

-- =============================================
-- 4. 门店数据汇总表 (汇总后统一推送ERP)
-- =============================================
DROP TABLE IF EXISTS store_aggregation_data;
CREATE TABLE store_aggregation_data (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    aggregation_no VARCHAR(64) NOT NULL COMMENT '汇总编号',
    store_id BIGINT NOT NULL COMMENT '门店ID',
    store_code VARCHAR(50) NOT NULL COMMENT '门店编码',
    store_name VARCHAR(100) DEFAULT NULL COMMENT '门店名称',
    data_type VARCHAR(50) NOT NULL COMMENT '数据类型: ORDER-订单, REFUND-退款, DAILY_REPORT-日报, SALES_SUMMARY-销售汇总, STOCK_CHANGE-库存变动, MEMBER_CHANGE-会员变动',
    aggregation_date DATE NOT NULL COMMENT '汇总日期',
    aggregation_start_time DATETIME NOT NULL COMMENT '汇总开始时间',
    aggregation_end_time DATETIME NOT NULL COMMENT '汇总结束时间',
    record_count INT DEFAULT 0 COMMENT '记录数量',
    total_amount DECIMAL(12,2) DEFAULT 0.00 COMMENT '总金额(订单/退款等)',
    summary_data JSON DEFAULT NULL COMMENT '汇总数据(JSON)',
    detail_ids JSON DEFAULT NULL COMMENT '原始数据ID列表(JSON)',
    erp_push_status TINYINT DEFAULT 0 COMMENT 'ERP推送状态: 0-未推送 1-推送中 2-已推送 3-推送失败',
    erp_push_time DATETIME DEFAULT NULL COMMENT 'ERP推送时间',
    erp_push_error VARCHAR(500) DEFAULT NULL COMMENT 'ERP推送错误',
    erp_push_attempts INT DEFAULT 0 COMMENT 'ERP推送重试次数',
    erp_batch_no VARCHAR(64) DEFAULT NULL COMMENT 'ERP批次号',
    status TINYINT DEFAULT 0 COMMENT '汇总状态: 0-待推送 1-推送中 2-已完成 3-推送失败',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_aggregation_no (aggregation_no),
    KEY idx_store_id (store_id),
    KEY idx_store_code (store_code),
    KEY idx_data_type (data_type),
    KEY idx_aggregation_date (aggregation_date),
    KEY idx_erp_push_status (erp_push_status),
    KEY idx_status (status),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='门店数据汇总表';

-- =============================================
-- 5. 给现有表添加 store_id 字段
-- =============================================

ALTER TABLE `order` ADD COLUMN store_id BIGINT DEFAULT NULL COMMENT '门店ID' AFTER id;
ALTER TABLE `order` ADD COLUMN store_code VARCHAR(50) DEFAULT NULL COMMENT '门店编码' AFTER store_id;
ALTER TABLE `order` ADD KEY idx_store_id (store_id);
ALTER TABLE `order` ADD KEY idx_store_code (store_code);

ALTER TABLE order_item ADD COLUMN store_id BIGINT DEFAULT NULL COMMENT '门店ID' AFTER id;
ALTER TABLE order_item ADD KEY idx_store_id (store_id);

ALTER TABLE payment_record ADD COLUMN store_id BIGINT DEFAULT NULL COMMENT '门店ID' AFTER id;
ALTER TABLE payment_record ADD KEY idx_store_id (store_id);

ALTER TABLE sales_summary ADD COLUMN store_id BIGINT DEFAULT NULL COMMENT '门店ID' AFTER id;
ALTER TABLE sales_summary ADD COLUMN store_code VARCHAR(50) DEFAULT NULL COMMENT '门店编码' AFTER store_id;
ALTER TABLE sales_summary ADD KEY idx_store_id (store_id);
ALTER TABLE sales_summary ADD KEY idx_store_code (store_code);

ALTER TABLE refund_order ADD COLUMN store_id BIGINT DEFAULT NULL COMMENT '门店ID' AFTER id;
ALTER TABLE refund_order ADD COLUMN store_code VARCHAR(50) DEFAULT NULL COMMENT '门店编码' AFTER store_id;
ALTER TABLE refund_order ADD KEY idx_store_id (store_id);
ALTER TABLE refund_order ADD KEY idx_store_code (store_code);

ALTER TABLE refund_order_item ADD COLUMN store_id BIGINT DEFAULT NULL COMMENT '门店ID' AFTER id;
ALTER TABLE refund_order_item ADD KEY idx_store_id (store_id);

ALTER TABLE daily_report ADD COLUMN store_code VARCHAR(50) DEFAULT NULL COMMENT '门店编码' AFTER shop_id;
ALTER TABLE daily_report ADD KEY idx_store_code (store_code);

ALTER TABLE product ADD COLUMN store_id BIGINT DEFAULT NULL COMMENT '门店ID(可为空表示全局商品)' AFTER id;
ALTER TABLE product ADD KEY idx_store_id (store_id);

ALTER TABLE product_stock ADD COLUMN store_id BIGINT DEFAULT NULL COMMENT '门店ID' AFTER id;
ALTER TABLE product_stock ADD COLUMN store_code VARCHAR(50) DEFAULT NULL COMMENT '门店编码' AFTER store_id;
ALTER TABLE product_stock ADD KEY idx_store_id (store_id);
ALTER TABLE product_stock ADD KEY idx_store_code (store_code);

ALTER TABLE point_record ADD COLUMN store_code VARCHAR(50) DEFAULT NULL COMMENT '门店编码' AFTER store_id;
ALTER TABLE point_record ADD KEY idx_store_code (store_code);

ALTER TABLE member_card_record ADD COLUMN store_code VARCHAR(50) DEFAULT NULL COMMENT '门店编码' AFTER store_id;
ALTER TABLE member_card_record ADD KEY idx_store_code (store_code);

ALTER TABLE electronic_invoice ADD COLUMN store_code VARCHAR(50) DEFAULT NULL COMMENT '门店编码' AFTER shop_name;
ALTER TABLE electronic_invoice ADD KEY idx_store_code (store_code);

ALTER TABLE invoice_wallet ADD COLUMN store_code VARCHAR(50) DEFAULT NULL COMMENT '门店编码' AFTER shop_name;
ALTER TABLE invoice_wallet ADD KEY idx_store_code (store_code);

ALTER TABLE cashier_device ADD COLUMN store_id BIGINT DEFAULT NULL COMMENT '门店ID' AFTER id;
ALTER TABLE cashier_device ADD COLUMN store_code VARCHAR(50) DEFAULT NULL COMMENT '门店编码' AFTER store_id;
ALTER TABLE cashier_device ADD KEY idx_store_id (store_id);
ALTER TABLE cashier_device ADD KEY idx_store_code (store_code);

ALTER TABLE erp_config ADD COLUMN store_id BIGINT DEFAULT NULL COMMENT '门店ID(为空表示全局配置)' AFTER id;
ALTER TABLE erp_config ADD KEY idx_store_id (store_id);

-- =============================================
-- 6. sys_user 表添加门店关联字段
-- =============================================
ALTER TABLE sys_user ADD COLUMN store_id BIGINT DEFAULT NULL COMMENT '所属门店ID(为空表示总部)' AFTER avatar;
ALTER TABLE sys_user ADD COLUMN store_code VARCHAR(50) DEFAULT NULL COMMENT '所属门店编码' AFTER store_id;
ALTER TABLE sys_user ADD COLUMN user_type TINYINT DEFAULT 1 COMMENT '用户类型: 1-门店收银员 2-门店管理员 3-总部管理员' AFTER store_code;
ALTER TABLE sys_user ADD KEY idx_store_id (store_id);
ALTER TABLE sys_user ADD KEY idx_user_type (user_type);

-- =============================================
-- 初始化门店数据
-- =============================================
INSERT INTO store (store_code, store_name, store_type, city, address, contact_phone, erp_config_mode, status, is_headquarters, remark) VALUES
('HQ', '总部', 1, '北京', '总部大楼', '010-88888888', 0, 1, 1, '总部管理'),
('STORE001', '朝阳旗舰店', 1, '北京', '朝阳区建国路100号', '010-66666666', 0, 1, 0, '朝阳直营旗舰店'),
('STORE002', '海淀店', 1, '北京', '海淀区中关村大街50号', '010-77777777', 0, 1, 0, '海淀直营店'),
('STORE003', '浦东加盟店', 2, '上海', '浦东新区陆家嘴路200号', '021-55555555', 1, 1, 0, '上海浦东加盟店(独立ERP)');

UPDATE sys_user SET store_id = NULL, user_type = 3 WHERE username = 'admin';
UPDATE sys_user SET store_id = 1, store_code = 'STORE001', user_type = 1 WHERE username = 'cashier01';

INSERT INTO sys_user (username, password, nickname, phone, status, store_id, store_code, user_type) VALUES
('manager_hq', 'e10adc3949ba59abbe56e057f20f883e', '总部管理员', '13800138010', 1, NULL, NULL, 3),
('cashier_store002', 'e10adc3949ba59abbe56e057f20f883e', '海淀收银员', '13800138002', 1, 2, 'STORE002', 1),
('manager_store001', 'e10adc3949ba59abbe56e057f20f883e', '朝阳店长', '13800138003', 1, 1, 'STORE001', 2);

INSERT INTO sys_role (role_name, role_code, description, status) VALUES
('总部管理员', 'hq_admin', '总部管理所有门店数据', 1),
('门店管理员', 'store_admin', '管理本门店数据', 1);

-- 初始化上海独立门店ERP配置
INSERT INTO store_erp_config (store_id, store_code, erp_type, base_url, auth_type, push_order_enabled, push_stock_enabled, push_daily_report_enabled, push_member_enabled, push_refund_enabled, status) VALUES
(3, 'STORE003', 'KINGDEE', 'https://erp-sh.example.com/api', 'TOKEN', 1, 1, 1, 1, 1, 1);
