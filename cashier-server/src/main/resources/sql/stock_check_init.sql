-- =============================================
-- 库存盘点系统数据库表
-- =============================================

USE cashier_db;

-- =============================================
-- 盘点任务表
-- =============================================
DROP TABLE IF EXISTS stock_check_task;
CREATE TABLE stock_check_task (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    task_no VARCHAR(32) NOT NULL COMMENT '盘点任务编号',
    task_name VARCHAR(200) NOT NULL COMMENT '盘点任务名称',
    task_type TINYINT DEFAULT 1 COMMENT '任务类型：1日常盘点 2月度盘点 3季度盘点 4年度盘点',
    check_mode TINYINT DEFAULT 1 COMMENT '盘点模式：1全盘 2抽盘',
    shop_id BIGINT DEFAULT NULL COMMENT '门店ID',
    shop_name VARCHAR(100) DEFAULT NULL COMMENT '门店名称',
    category_id BIGINT DEFAULT NULL COMMENT '分类ID（抽盘时用）',
    category_name VARCHAR(100) DEFAULT NULL COMMENT '分类名称',
    plan_start_time DATETIME DEFAULT NULL COMMENT '计划开始时间',
    plan_end_time DATETIME DEFAULT NULL COMMENT '计划结束时间',
    actual_start_time DATETIME DEFAULT NULL COMMENT '实际开始时间',
    actual_end_time DATETIME DEFAULT NULL COMMENT '实际结束时间',
    operator_id BIGINT DEFAULT NULL COMMENT '操作员ID',
    operator_name VARCHAR(50) DEFAULT NULL COMMENT '操作员名称',
    task_status TINYINT DEFAULT 0 COMMENT '任务状态：0草稿 1已发布 2进行中 3已完成 4已取消',
    sync_status TINYINT DEFAULT 0 COMMENT '同步状态：0未同步 1已同步ERP',
    erp_task_id VARCHAR(64) DEFAULT NULL COMMENT 'ERP任务ID',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_task_no (task_no),
    KEY idx_shop_id (shop_id),
    KEY idx_task_status (task_status),
    KEY idx_check_mode (check_mode),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='盘点任务表';

-- =============================================
-- 盘点明细表
-- =============================================
DROP TABLE IF EXISTS stock_check_item;
CREATE TABLE stock_check_item (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    task_id BIGINT NOT NULL COMMENT '盘点任务ID',
    task_no VARCHAR(32) NOT NULL COMMENT '盘点任务编号',
    product_id BIGINT NOT NULL COMMENT '商品ID',
    erp_goods_id VARCHAR(64) DEFAULT NULL COMMENT 'ERP商品ID',
    product_name VARCHAR(200) NOT NULL COMMENT '商品名称',
    category_name VARCHAR(100) DEFAULT NULL COMMENT '分类名称',
    barcode VARCHAR(64) DEFAULT NULL COMMENT '商品条码',
    unit VARCHAR(20) DEFAULT NULL COMMENT '单位',
    price DECIMAL(10,2) DEFAULT 0.00 COMMENT '单价',
    theoretical_stock INT DEFAULT 0 COMMENT '理论库存',
    actual_stock INT DEFAULT NULL COMMENT '实盘数量',
    diff_quantity INT DEFAULT NULL COMMENT '差异数量',
    diff_amount DECIMAL(12,2) DEFAULT NULL COMMENT '差异金额',
    check_status TINYINT DEFAULT 0 COMMENT '盘点状态：0未盘 1已盘',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (id),
    KEY idx_task_id (task_id),
    KEY idx_product_id (product_id),
    KEY idx_erp_goods_id (erp_goods_id),
    KEY idx_barcode (barcode),
    KEY idx_check_status (check_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='盘点明细表';

-- =============================================
-- 盘点扫码记录表
-- =============================================
DROP TABLE IF EXISTS stock_check_record;
CREATE TABLE stock_check_record (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    task_id BIGINT NOT NULL COMMENT '盘点任务ID',
    task_no VARCHAR(32) NOT NULL COMMENT '盘点任务编号',
    item_id BIGINT DEFAULT NULL COMMENT '盘点明细ID',
    product_id BIGINT DEFAULT NULL COMMENT '商品ID',
    erp_goods_id VARCHAR(64) DEFAULT NULL COMMENT 'ERP商品ID',
    barcode VARCHAR(64) DEFAULT NULL COMMENT '扫码条码',
    scan_quantity INT DEFAULT 1 COMMENT '扫码数量',
    input_quantity INT DEFAULT NULL COMMENT '手动输入数量',
    operator_id BIGINT DEFAULT NULL COMMENT '操作员ID',
    operator_name VARCHAR(50) DEFAULT NULL COMMENT '操作员名称',
    scan_time DATETIME DEFAULT NULL COMMENT '扫码时间',
    device_id VARCHAR(64) DEFAULT NULL COMMENT '设备ID',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (id),
    KEY idx_task_id (task_id),
    KEY idx_item_id (item_id),
    KEY idx_product_id (product_id),
    KEY idx_barcode (barcode),
    KEY idx_scan_time (scan_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='盘点扫码记录表';

-- =============================================
-- 盘点差异表
-- =============================================
DROP TABLE IF EXISTS stock_check_diff;
CREATE TABLE stock_check_diff (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    diff_no VARCHAR(32) NOT NULL COMMENT '差异编号',
    task_id BIGINT NOT NULL COMMENT '盘点任务ID',
    task_no VARCHAR(32) NOT NULL COMMENT '盘点任务编号',
    item_id BIGINT NOT NULL COMMENT '盘点明细ID',
    product_id BIGINT NOT NULL COMMENT '商品ID',
    erp_goods_id VARCHAR(64) DEFAULT NULL COMMENT 'ERP商品ID',
    product_name VARCHAR(200) NOT NULL COMMENT '商品名称',
    category_name VARCHAR(100) DEFAULT NULL COMMENT '分类名称',
    unit VARCHAR(20) DEFAULT NULL COMMENT '单位',
    price DECIMAL(10,2) DEFAULT 0.00 COMMENT '单价',
    theoretical_stock INT DEFAULT 0 COMMENT '理论库存',
    actual_stock INT DEFAULT 0 COMMENT '实盘数量',
    diff_quantity INT NOT NULL COMMENT '差异数量',
    diff_amount DECIMAL(12,2) DEFAULT 0.00 COMMENT '差异金额',
    diff_type TINYINT NOT NULL COMMENT '差异类型：1盘盈 2盘亏',
    handle_type TINYINT DEFAULT NULL COMMENT '处理类型：1报损单 2库存调整单',
    handle_no VARCHAR(32) DEFAULT NULL COMMENT '处理单据号',
    handle_time DATETIME DEFAULT NULL COMMENT '处理时间',
    handle_status TINYINT DEFAULT 0 COMMENT '处理状态：0待处理 1已处理 2已同步ERP',
    operator_name VARCHAR(50) DEFAULT NULL COMMENT '处理人',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_diff_no (diff_no),
    KEY idx_task_id (task_id),
    KEY idx_product_id (product_id),
    KEY idx_diff_type (diff_type),
    KEY idx_handle_status (handle_status),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='盘点差异表';

-- =============================================
-- 初始化数据
-- =============================================

-- 插入测试盘点任务
INSERT INTO stock_check_task (
    task_no, task_name, task_type, check_mode, shop_id, shop_name,
    plan_start_time, plan_end_time, task_status, create_time, update_time
) VALUES
('PD202506010001', '6月日常盘点', 1, 1, 1, '总店',
 '2025-06-01 08:00:00', '2025-06-01 18:00:00', 1, NOW(), NOW()),
('PD202506010002', '6月蔬菜类抽盘', 1, 2, 1, '总店',
 '2025-06-01 09:00:00', '2025-06-01 12:00:00', 0, NOW(), NOW());
