-- ERP对接配置中心数据库初始化脚本

USE cashier_db;

-- ERP系统配置表
DROP TABLE IF EXISTS erp_config;
CREATE TABLE erp_config (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    config_code VARCHAR(50) NOT NULL COMMENT '配置编码',
    config_name VARCHAR(100) NOT NULL COMMENT '配置名称',
    erp_type VARCHAR(50) NOT NULL COMMENT 'ERP类型：CUSTOM REST_API MIDDLE_TABLE',
    base_url VARCHAR(500) DEFAULT NULL COMMENT 'ERP接口基础地址',
    auth_type VARCHAR(30) NOT NULL DEFAULT 'NONE' COMMENT '认证方式：NONE APP_KEY_SIGN TOKEN BASIC OAUTH2',
    app_key VARCHAR(100) DEFAULT NULL COMMENT '应用Key',
    app_secret VARCHAR(200) DEFAULT NULL COMMENT '应用密钥',
    token VARCHAR(500) DEFAULT NULL COMMENT '访问令牌',
    token_expire_time DATETIME DEFAULT NULL COMMENT '令牌过期时间',
    username VARCHAR(50) DEFAULT NULL COMMENT 'Basic认证用户名',
    password VARCHAR(100) DEFAULT NULL COMMENT 'Basic认证密码',
    timeout INT DEFAULT 30000 COMMENT '超时时间(ms)',
    retry_times INT DEFAULT 3 COMMENT '重试次数',
    retry_interval INT DEFAULT 5000 COMMENT '重试间隔(ms)',
    middle_table_config TEXT DEFAULT NULL COMMENT '中间表配置JSON：数据源、表名、字段映射等',
    is_default TINYINT DEFAULT 0 COMMENT '是否默认：0否 1是',
    status TINYINT DEFAULT 1 COMMENT '状态：0禁用 1启用',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_config_code (config_code),
    KEY idx_erp_type (erp_type),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='ERP系统配置表';

-- ERP接口映射表
DROP TABLE IF EXISTS erp_interface_mapping;
CREATE TABLE erp_interface_mapping (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    config_id BIGINT NOT NULL COMMENT 'ERP配置ID',
    business_type VARCHAR(50) NOT NULL COMMENT '业务类型：PRODUCT_LIST PRODUCT_DETAIL STOCK_LIST ORDER_CREATE ORDER_CALLBACK MEMBER_LIST DAILY_REPORT_PUSH STOCK_CHECK_TASK_LIST STOCK_CHECK_RESULT_PUSH',
    interface_name VARCHAR(100) NOT NULL COMMENT '接口名称',
    interface_path VARCHAR(200) NOT NULL COMMENT '接口路径',
    http_method VARCHAR(10) DEFAULT 'POST' COMMENT 'HTTP方法：GET POST PUT DELETE',
    request_content_type VARCHAR(50) DEFAULT 'application/json' COMMENT '请求内容类型',
    request_template TEXT DEFAULT NULL COMMENT '请求模板JSON',
    response_data_path VARCHAR(200) DEFAULT 'data' COMMENT '响应数据路径（JSONPath）',
    response_code_field VARCHAR(50) DEFAULT 'code' COMMENT '响应状态码字段',
    response_success_code VARCHAR(20) DEFAULT '200' COMMENT '响应成功码',
    response_message_field VARCHAR(50) DEFAULT 'message' COMMENT '响应消息字段',
    page_enabled TINYINT DEFAULT 0 COMMENT '是否分页：0否 1是',
    page_size_param VARCHAR(50) DEFAULT 'pageSize' COMMENT '分页大小参数名',
    page_num_param VARCHAR(50) DEFAULT 'pageNum' COMMENT '页码参数名',
    sync_direction VARCHAR(10) NOT NULL DEFAULT 'PUSH' COMMENT '同步方向：PUSH推送到ERP PULL从ERP拉取',
    status TINYINT DEFAULT 1 COMMENT '状态：0禁用 1启用',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_config_business (config_id, business_type),
    KEY idx_business_type (business_type),
    KEY idx_sync_direction (sync_direction)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='ERP接口映射表';

-- ERP字段映射表
DROP TABLE IF EXISTS erp_field_mapping;
CREATE TABLE erp_field_mapping (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    interface_mapping_id BIGINT NOT NULL COMMENT '接口映射ID',
    mapping_direction VARCHAR(10) NOT NULL COMMENT '映射方向：REQUEST本地到ERP RESPONSE ERP到本地',
    local_field VARCHAR(100) NOT NULL COMMENT '本地字段名',
    local_field_type VARCHAR(30) DEFAULT 'STRING' COMMENT '本地字段类型：STRING INTEGER LONG DECIMAL BOOLEAN DATETIME DATE',
    erp_field VARCHAR(100) NOT NULL COMMENT 'ERP字段名',
    erp_field_type VARCHAR(30) DEFAULT 'STRING' COMMENT 'ERP字段类型',
    is_required TINYINT DEFAULT 0 COMMENT '是否必填：0否 1是',
    default_value VARCHAR(500) DEFAULT NULL COMMENT '默认值',
    transform_expression TEXT DEFAULT NULL COMMENT '转换表达式：支持简单函数如 formatDate, substring, concat等',
    sort INT DEFAULT 0 COMMENT '排序',
    status TINYINT DEFAULT 1 COMMENT '状态：0禁用 1启用',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (id),
    KEY idx_interface_mapping_id (interface_mapping_id),
    KEY idx_mapping_direction (mapping_direction)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='ERP字段映射表';

-- ERP数据值映射表（订单状态、支付方式等枚举映射）
DROP TABLE IF EXISTS erp_data_mapping;
CREATE TABLE erp_data_mapping (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    config_id BIGINT NOT NULL COMMENT 'ERP配置ID',
    mapping_type VARCHAR(50) NOT NULL COMMENT '映射类型：ORDER_STATUS PAY_TYPE PRODUCT_STATUS MEMBER_LEVEL PAY_STATUS',
    mapping_code VARCHAR(100) NOT NULL COMMENT '映射编码（本地值）',
    mapping_name VARCHAR(100) DEFAULT NULL COMMENT '映射名称（本地描述）',
    erp_code VARCHAR(100) NOT NULL COMMENT 'ERP编码',
    erp_name VARCHAR(100) DEFAULT NULL COMMENT 'ERP描述',
    sort INT DEFAULT 0 COMMENT '排序',
    status TINYINT DEFAULT 1 COMMENT '状态：0禁用 1启用',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_config_type_code (config_id, mapping_type, mapping_code),
    KEY idx_mapping_type (mapping_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='ERP数据值映射表';

-- ERP同步日志表
DROP TABLE IF EXISTS erp_sync_log;
CREATE TABLE erp_sync_log (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    config_id BIGINT NOT NULL COMMENT 'ERP配置ID',
    business_type VARCHAR(50) NOT NULL COMMENT '业务类型',
    sync_direction VARCHAR(10) NOT NULL COMMENT '同步方向：PUSH PULL',
    sync_type VARCHAR(20) NOT NULL DEFAULT 'AUTO' COMMENT '同步类型：AUTO自动 MANUAL手动 RETRY重试',
    batch_no VARCHAR(64) DEFAULT NULL COMMENT '同步批次号',
    business_id VARCHAR(64) DEFAULT NULL COMMENT '业务ID（订单号、商品ID等）',
    request_url VARCHAR(500) DEFAULT NULL COMMENT '请求URL',
    request_method VARCHAR(10) DEFAULT NULL COMMENT '请求方法',
    request_body TEXT DEFAULT NULL COMMENT '请求体',
    response_body TEXT DEFAULT NULL COMMENT '响应体',
    sync_status TINYINT NOT NULL DEFAULT 0 COMMENT '同步状态：0待同步 1同步中 2成功 3失败',
    error_code VARCHAR(50) DEFAULT NULL COMMENT '错误码',
    error_message VARCHAR(1000) DEFAULT NULL COMMENT '错误信息',
    retry_count INT DEFAULT 0 COMMENT '已重试次数',
    max_retry_count INT DEFAULT 3 COMMENT '最大重试次数',
    next_retry_time DATETIME DEFAULT NULL COMMENT '下次重试时间',
    cost_time INT DEFAULT 0 COMMENT '耗时(ms)',
    sync_time DATETIME DEFAULT NULL COMMENT '同步时间',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (id),
    KEY idx_config_id (config_id),
    KEY idx_business_type (business_type),
    KEY idx_sync_status (sync_status),
    KEY idx_business_id (business_id),
    KEY idx_batch_no (batch_no),
    KEY idx_sync_time (sync_time),
    KEY idx_next_retry (next_retry_time, sync_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='ERP同步日志表';

-- ERP同步任务配置表
DROP TABLE IF EXISTS erp_sync_task;
CREATE TABLE erp_sync_task (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    config_id BIGINT NOT NULL COMMENT 'ERP配置ID',
    task_code VARCHAR(50) NOT NULL COMMENT '任务编码',
    task_name VARCHAR(100) NOT NULL COMMENT '任务名称',
    business_type VARCHAR(50) NOT NULL COMMENT '业务类型',
    sync_direction VARCHAR(10) NOT NULL COMMENT '同步方向：PUSH PULL',
    cron_expression VARCHAR(100) DEFAULT NULL COMMENT 'Cron表达式',
    execute_interval INT DEFAULT NULL COMMENT '执行间隔(秒)，与cron二选一',
    task_params TEXT DEFAULT NULL COMMENT '任务参数JSON',
    page_size INT DEFAULT 100 COMMENT '每页处理数量',
    enabled TINYINT DEFAULT 1 COMMENT '是否启用：0否 1是',
    last_execute_time DATETIME DEFAULT NULL COMMENT '上次执行时间',
    last_execute_status TINYINT DEFAULT NULL COMMENT '上次执行状态：1成功 2失败',
    last_execute_result VARCHAR(500) DEFAULT NULL COMMENT '上次执行结果',
    status TINYINT DEFAULT 1 COMMENT '状态：0禁用 1启用',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_task_code (task_code),
    KEY idx_config_id (config_id),
    KEY idx_business_type (business_type),
    KEY idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='ERP同步任务配置表';

-- ERP商品同步策略表
DROP TABLE IF EXISTS erp_product_sync_strategy;
CREATE TABLE erp_product_sync_strategy (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    config_id BIGINT NOT NULL COMMENT 'ERP配置ID',
    strategy_name VARCHAR(100) NOT NULL COMMENT '策略名称',
    full_sync_cron VARCHAR(100) DEFAULT '0 0 2 * * ?' COMMENT '全量同步Cron表达式（默认凌晨2点）',
    full_sync_enabled TINYINT DEFAULT 1 COMMENT '全量同步是否启用：0否 1是',
    incremental_sync_cron VARCHAR(100) DEFAULT '0 0/30 * * * ?' COMMENT '增量同步Cron表达式（默认每30分钟）',
    incremental_sync_enabled TINYINT DEFAULT 1 COMMENT '增量同步是否启用：0否 1是',
    incremental_fields VARCHAR(500) DEFAULT 'stock,price,status' COMMENT '增量同步字段（逗号分隔）',
    last_full_sync_time DATETIME DEFAULT NULL COMMENT '上次全量同步时间',
    last_incremental_sync_time DATETIME DEFAULT NULL COMMENT '上次增量同步时间',
    sync_time_field VARCHAR(50) DEFAULT 'updateTime' COMMENT 'ERP时间戳字段名',
    page_size INT DEFAULT 500 COMMENT '分页大小',
    enable_stock_sync TINYINT DEFAULT 1 COMMENT '是否同步库存：0否 1是',
    enable_price_sync TINYINT DEFAULT 1 COMMENT '是否同步价格：0否 1是',
    enable_category_sync TINYINT DEFAULT 1 COMMENT '是否同步分类：0否 1是',
    status TINYINT DEFAULT 1 COMMENT '状态：0禁用 1启用',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    is_deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删除 1已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_config_id (config_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='ERP商品同步策略表';

-- 初始化默认ERP配置
INSERT INTO erp_config (config_code, config_name, erp_type, base_url, auth_type, app_key, app_secret, timeout, retry_times, retry_interval, is_default, status, create_time, update_time) VALUES
('DEFAULT_ERP', '默认ERP系统', 'REST_API', 'http://localhost:9000/api/erp', 'APP_KEY_SIGN', 'CASHIER_APP', 'CASHIER_SECRET_2024', 30000, 3, 5000, 1, 1, NOW(), NOW());

-- 初始化默认接口映射
INSERT INTO erp_interface_mapping (config_id, business_type, interface_name, interface_path, http_method, request_content_type, response_data_path, response_code_field, response_success_code, response_message_field, sync_direction, status, create_time, update_time) VALUES
(1, 'PRODUCT_LIST', '获取商品列表', '/product/list', 'POST', 'application/json', 'data', 'code', '200', 'message', 'PULL', 1, NOW(), NOW()),
(1, 'STOCK_LIST', '获取库存列表', '/stock/list', 'POST', 'application/json', 'data', 'code', '200', 'message', 'PULL', 1, NOW(), NOW()),
(1, 'ORDER_CREATE', '创建订单', '/order/create', 'POST', 'application/json', 'data', 'code', '200', 'message', 'PUSH', 1, NOW(), NOW()),
(1, 'ORDER_CALLBACK', '订单回调', '/order/callback', 'POST', 'application/json', 'data', 'code', '200', 'message', 'PULL', 1, NOW(), NOW()),
(1, 'MEMBER_LIST', '获取会员列表', '/member/list', 'POST', 'application/json', 'data', 'code', '200', 'message', 'PULL', 1, NOW(), NOW()),
(1, 'DAILY_REPORT_PUSH', '推送营业日报', '/report/daily/push', 'POST', 'application/json', 'data', 'code', '200', 'message', 'PUSH', 1, NOW(), NOW()),
(1, 'STOCK_CHECK_TASK_LIST', '获取盘点任务列表', '/stock/check/task/list', 'POST', 'application/json', 'data', 'code', '200', 'message', 'PULL', 1, NOW(), NOW()),
(1, 'STOCK_CHECK_RESULT_PUSH', '推送盘点结果', '/stock/check/result/push', 'POST', 'application/json', 'data', 'code', '200', 'message', 'PUSH', 1, NOW(), NOW()),
(1, 'STOCK_CHECK_DIFF_PUSH', '推送盘点差异', '/stock/check/diff/push', 'POST', 'application/json', 'data', 'code', '200', 'message', 'PUSH', 1, NOW(), NOW()),
(1, 'MEMBER_POINTS_PUSH', '推送积分变动', '/member/points/push', 'POST', 'application/json', 'data', 'code', '200', 'message', 'PUSH', 1, NOW(), NOW()),
(1, 'MEMBER_CARD_RECORDS_PUSH', '推送会员卡交易', '/member/card/records/push', 'POST', 'application/json', 'data', 'code', '200', 'message', 'PUSH', 1, NOW(), NOW()),
(1, 'CATEGORY_LIST', '获取分类列表', '/category/list', 'POST', 'application/json', 'data', 'code', '200', 'message', 'PULL', 1, NOW(), NOW()),
(1, 'SALES_SUMMARY_PUSH', '推送销售汇总', '/sales/summary/push', 'POST', 'application/json', 'data', 'code', '200', 'message', 'PUSH', 1, NOW(), NOW()),
(1, 'STOCK_UPDATE', '更新库存', '/stock/update', 'POST', 'application/json', 'data', 'code', '200', 'message', 'PUSH', 1, NOW(), NOW());

-- 初始化默认数据映射（订单状态）
INSERT INTO erp_data_mapping (config_id, mapping_type, mapping_code, mapping_name, erp_code, erp_name, sort, status, create_time, update_time) VALUES
(1, 'ORDER_STATUS', '1', '待支付', '10', '待支付', 1, 1, NOW(), NOW()),
(1, 'ORDER_STATUS', '2', '已支付', '20', '已支付', 2, 1, NOW(), NOW()),
(1, 'ORDER_STATUS', '3', '已完成', '30', '已完成', 3, 1, NOW(), NOW()),
(1, 'ORDER_STATUS', '4', '已取消', '40', '已取消', 4, 1, NOW(), NOW()),
(1, 'PAY_TYPE', 'cash', '现金', 'CASH', '现金', 1, 1, NOW(), NOW()),
(1, 'PAY_TYPE', 'wechat', '微信', 'WECHAT', '微信支付', 2, 1, NOW(), NOW()),
(1, 'PAY_TYPE', 'alipay', '支付宝', 'ALIPAY', '支付宝', 3, 1, NOW(), NOW()),
(1, 'PAY_TYPE', 'member', '会员卡', 'MEMBER_CARD', '会员卡', 4, 1, NOW(), NOW()),
(1, 'PRODUCT_STATUS', '0', '下架', '0', '下架', 1, 1, NOW(), NOW()),
(1, 'PRODUCT_STATUS', '1', '上架', '1', '上架', 2, 1, NOW(), NOW()),
(1, 'PAY_STATUS', '0', '未支付', '0', '未支付', 1, 1, NOW(), NOW()),
(1, 'PAY_STATUS', '1', '已支付', '1', '已支付', 2, 1, NOW(), NOW());

-- 初始化默认同步任务
INSERT INTO erp_sync_task (config_id, task_code, task_name, business_type, sync_direction, cron_expression, task_params, page_size, enabled, status, create_time, update_time) VALUES
(1, 'SYNC_PRODUCTS', '同步商品数据', 'PRODUCT_LIST', 'PULL', '0 0/30 * * * ?', NULL, 100, 1, 1, NOW(), NOW()),
(1, 'SYNC_STOCK', '同步库存数据', 'STOCK_LIST', 'PULL', '0 0/10 * * * ?', NULL, 100, 1, 1, NOW(), NOW()),
(1, 'SYNC_ORDERS', '同步订单到ERP', 'ORDER_CREATE', 'PUSH', '0 0/5 * * * ?', NULL, 100, 1, 1, NOW(), NOW()),
(1, 'SYNC_MEMBERS', '同步会员数据', 'MEMBER_LIST', 'PULL', '0 0/30 * * * ?', NULL, 100, 1, 1, NOW(), NOW()),
(1, 'SYNC_STOCK_CHECK_TASKS', '同步盘点任务', 'STOCK_CHECK_TASK_LIST', 'PULL', '0 0/15 * * * ?', NULL, 50, 1, 1, NOW(), NOW()),
(1, 'RETRY_FAILED_LOGS', '重试失败同步记录', 'RETRY', 'PUSH', '0 0/10 * * * ?', NULL, 50, 1, 1, NOW(), NOW());

-- 初始化默认商品同步策略
INSERT INTO erp_product_sync_strategy (config_id, strategy_name, full_sync_cron, full_sync_enabled, incremental_sync_cron, incremental_sync_enabled, incremental_fields, sync_time_field, page_size, enable_stock_sync, enable_price_sync, enable_category_sync, status, create_time, update_time) VALUES
(1, '默认商品同步策略', '0 0 2 * * ?', 1, '0 0/30 * * * ?', 1, 'stock,price,status', 'updateTime', 500, 1, 1, 1, 1, NOW(), NOW());
