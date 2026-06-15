# 架构设计文档

## 目录

- [整体架构](#整体架构)
- [系统模块](#系统模块)
- [数据流设计](#数据流设计)
- [离线同步机制](#离线同步机制)
- [技术选型](#技术选型)
- [数据库设计](#数据库设计)

## 整体架构

### 架构概述

本系统采用**前后端分离**的架构设计，包含 PC 收银端（Electron）、后端服务、微信小程序和 ERP 对接四个主要部分。系统支持离线运行，网络恢复后自动同步数据，确保收银业务不中断。

### 架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                            外部系统                                  │
│  ┌─────────────┐                          ┌─────────────────────┐  │
│  │  ERP 系统    │◄────────────────────────►│  微信小程序         │  │
│  └──────┬──────┘                          └──────────┬──────────┘  │
└─────────┼─────────────────────────────────────────────┼─────────────┘
          │                                             │
          │ REST API / 消息队列                         │ WebSocket / HTTP
          │                                             │
┌─────────┴─────────────────────────────────────────────┴─────────────┐
│                         后端服务 (cashier-server)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ 认证模块  │  │ 商品管理  │  │ 订单管理  │  │ ERP 同步服务      │  │
│  └──────┬───┘  └──────┬───┘  └──────┬───┘  └────────┬─────────┘  │
│         │             │             │                │            │
│  ┌──────┴─────────────┴─────────────┴────────────────┴─────────┐  │
│  │                    MyBatis Plus / 数据访问层                 │  │
│  └──────┬───────────────────────┬──────────────────────┬───────┘  │
└─────────┼───────────────────────┼──────────────────────┼──────────┘
          │                       │                      │
    ┌─────┴─────┐           ┌─────┴─────┐          ┌───┴─────┐
    │   MySQL   │           │   Redis   │          │ActiveMQ │
    │  (主数据)  │           │  (缓存)   │          │ (消息队列)│
    └───────────┘           └───────────┘          └─────────┘
          ↑
          │ WebSocket / HTTP API
          │
┌─────────┴─────────────────────────────────────────────────────────┐
│                      PC 收银端 (cashier-client)                    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                        Electron                          │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐   │    │
│  │  │  React 界面  │  │  离线队列   │  │  WebSocket   │   │    │
│  │  └──────┬──────┘  └──────┬──────┘  └───────┬───────┘   │    │
│  │         │                │                  │           │    │
│  │  ┌──────┴────────────────┴──────────────────┴───────┐   │    │
│  │  │              Dexie.js (IndexedDB)                 │   │    │
│  │  │         (本地商品缓存 / 离线订单)                  │   │    │
│  │  └───────────────────────────────────────────────────┘   │    │
│  └──────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────┘
```

### 架构特点

1. **高可用性**：收银端支持离线运行，断网不影响业务
2. **数据一致性**：通过消息队列和重试机制保证数据最终一致性
3. **实时性**：WebSocket 实时推送商品、库存、订单状态变更
4. **扩展性**：模块化设计，易于扩展新功能
5. **安全性**：JWT 认证、权限控制、数据加密

## 系统模块

### 1. 后端服务 (cashier-server)

| 模块 | 说明 |
|------|------|
| 认证模块 | 用户登录、Token 管理、权限验证 |
| 商品管理 | 商品 CRUD、分类管理、库存管理 |
| 订单管理 | 订单创建、支付、查询、状态流转 |
| ERP 同步 | 商品同步、库存同步、订单同步 |
| WebSocket | 实时消息推送、在线状态管理 |
| 消息队列 | 异步处理、流量削峰、解耦 |

### 2. PC 收银端 (cashier-client)

| 模块 | 说明 |
|------|------|
| 收银台 | 商品展示、购物车、结算支付 |
| 订单管理 | 订单查询、订单详情、订单重传 |
| 系统设置 | 基础配置、同步设置 |
| 本地数据库 | Dexie.js 缓存商品、存储离线订单 |
| 离线队列 | 断网操作队列，联网后自动同步 |
| WebSocket 客户端 | 实时接收服务端推送 |

### 3. 微信小程序 (cashier-miniapp)

| 模块 | 说明 |
|------|------|
| 首页/商品列表 | 浏览商品、扫码点餐 |
| 购物车 | 商品管理、金额计算 |
| 订单确认 | 确认订单、选择支付方式 |
| 订单列表 | 历史订单查询 |
| 订单详情 | 订单状态、支付详情 |

### 4. ERP 对接

| 模块 | 说明 |
|------|------|
| 商品推送 | ERP 主动推送商品数据 |
| 库存推送 | ERP 主动推送库存变动 |
| 订单推送 | 订单上传到 ERP 系统 |
| 订单回调 | ERP 处理结果回调通知 |
| 定时同步 | 定时拉取 ERP 数据 |

## 数据流设计

### 1. 商品数据流向

```
ERP 系统
    │
    ├── 主动推送 → 后端服务 → MySQL → WebSocket → 收银端
    │                                    │
    │                                    └── Redis 缓存
    │
    └── 定时拉取 ← 后端服务 ← 定时任务
```

**流程说明：**

1. ERP 系统作为商品主数据源
2. 商品变更时，ERP 主动推送到后端接口
3. 后端更新 MySQL 数据库，同时更新 Redis 缓存
4. 通过 WebSocket 推送到在线收银端
5. 收银端更新本地 IndexedDB 缓存
6. 后端定时任务定期全量同步，确保数据一致

### 2. 订单数据流向（在线模式）

```
收银端 → 后端服务 → MySQL → 消息队列 → ERP 同步服务 → ERP 系统
                                          │
                                          └── 成功/失败回调
```

**流程说明：**

1. 收银端创建订单，调用后端接口
2. 后端保存订单到数据库（同步状态：未同步）
3. 发送消息到 ActiveMQ 队列
4. ERP 同步服务消费消息，调用 ERP 接口
5. 同步成功：更新订单同步状态为已同步
6. 同步失败：记录错误，等待重试

### 3. 订单数据流向（离线模式）

```
收银端（断网）
    │
    ├── 创建订单 → 本地 IndexedDB（状态：待同步）
    │
    └── 网络恢复 → 检测到在线 → 遍历离线队列 → 批量上传 → 后端 → ERP
```

**流程说明：**

1. 收银端断网时，订单保存到本地数据库
2. 同时加入离线同步队列
3. 网络恢复后，自动检测并开始同步
4. 按顺序处理离线队列中的订单
5. 同步成功后移除队列，更新本地状态
6. 同步失败保留队列，下次重试

## 离线同步机制

### 1. 离线检测

- 使用 `navigator.onLine` 检测网络状态
- 监听 `online` / `offline` 事件
- WebSocket 心跳检测辅助判断

### 2. 离线队列设计

**队列数据结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Number | 主键 |
| action | String | 操作类型（如：POST_/order） |
| data | String | 请求数据（JSON 序列化） |
| status | Number | 状态：0待处理 1成功 2失败 |
| retry_count | Number | 重试次数 |
| created_at | Date | 创建时间 |
| updated_at | Date | 更新时间 |

### 3. 同步策略

**触发同步时机：**
1. 网络从离线变为在线时
2. 应用启动时
3. 用户手动触发同步
4. 定时轮询（可选）

**重试策略：**
- 最多重试 5 次
- 重试间隔递增（1分钟、5分钟、15分钟、30分钟、1小时）
- 超过最大重试次数标记为失败，需人工介入

**同步顺序：**
- 按创建时间先后顺序处理
- 保证同一操作的顺序性

### 4. 数据冲突处理

**商品数据冲突：**
- 以 ERP 数据为准，收银端只读取不修改
- 通过版本号或更新时间判断新旧

**订单数据冲突：**
- 以本地订单为主，上传到服务端
- 服务端根据订单号去重
- 重复订单直接返回成功

## 技术选型

### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Spring Boot | 2.7.x | 应用框架 |
| MyBatis Plus | 3.x | ORM 框架 |
| MySQL | 8.0+ | 关系型数据库 |
| Redis | 5.0+ | 缓存服务 |
| ActiveMQ | 5.15+ | 消息队列 |
| WebSocket | - | 实时通信 |
| JWT | - | 身份认证 |
| Lombok | - | 代码简化 |

### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| Ant Design | 5.x | UI 组件库 |
| Electron | 28.x | 桌面应用框架 |
| Dexie.js | 3.x | IndexedDB 封装 |
| Axios | 1.x | HTTP 客户端 |
| Vite | 5.x | 构建工具 |
| React Router | 6.x | 路由管理 |

### 小程序技术栈

| 技术 | 说明 |
|------|------|
| 微信小程序原生 | 小程序框架 |
| 原生 API | 网络、存储等 |

## 数据库设计

### 核心数据表

#### 商品分类表 (product_category)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| erp_category_id | VARCHAR(64) | ERP 分类 ID |
| category_name | VARCHAR(100) | 分类名称 |
| sort | INT | 排序 |
| status | TINYINT | 状态 |
| create_time | DATETIME | 创建时间 |
| update_time | DATETIME | 更新时间 |
| is_deleted | TINYINT | 逻辑删除 |

#### 商品表 (product)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| erp_goods_id | VARCHAR(64) | ERP 商品 ID |
| product_name | VARCHAR(200) | 商品名称 |
| category_id | BIGINT | 分类 ID |
| category_name | VARCHAR(100) | 分类名称 |
| price | DECIMAL(10,2) | 售价 |
| original_price | DECIMAL(10,2) | 原价 |
| unit | VARCHAR(20) | 单位 |
| image | VARCHAR(500) | 商品图片 |
| description | VARCHAR(1000) | 商品描述 |
| stock | INT | 库存数量 |
| status | TINYINT | 状态 |
| sort | INT | 排序 |
| create_time | DATETIME | 创建时间 |
| update_time | DATETIME | 更新时间 |
| is_deleted | TINYINT | 逻辑删除 |

#### 商品库存表 (product_stock)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| product_id | BIGINT | 商品 ID |
| erp_goods_id | VARCHAR(64) | ERP 商品 ID |
| stock | INT | 总库存 |
| frozen_stock | INT | 冻结库存 |
| available_stock | INT | 可用库存 |
| create_time | DATETIME | 创建时间 |
| update_time | DATETIME | 更新时间 |
| is_deleted | TINYINT | 逻辑删除 |

#### 订单表 (order_info)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| order_no | VARCHAR(64) | 订单号 |
| erp_order_id | VARCHAR(64) | ERP 订单 ID |
| total_amount | DECIMAL(10,2) | 订单总金额 |
| discount_amount | DECIMAL(10,2) | 优惠金额 |
| pay_amount | DECIMAL(10,2) | 实付金额 |
| pay_status | TINYINT | 支付状态 |
| order_status | TINYINT | 订单状态 |
| sync_status | TINYINT | 同步状态 |
| sync_attempts | INT | 同步重试次数 |
| sync_error_message | VARCHAR(500) | 同步错误信息 |
| cashier_id | BIGINT | 收银员 ID |
| cashier_name | VARCHAR(50) | 收银员姓名 |
| remark | VARCHAR(500) | 备注 |
| create_time | DATETIME | 创建时间 |
| update_time | DATETIME | 更新时间 |
| is_deleted | TINYINT | 逻辑删除 |

#### 订单明细表 (order_item)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| order_id | BIGINT | 订单 ID |
| order_no | VARCHAR(64) | 订单号 |
| product_id | BIGINT | 商品 ID |
| erp_goods_id | VARCHAR(64) | ERP 商品 ID |
| product_name | VARCHAR(200) | 商品名称 |
| image | VARCHAR(500) | 商品图片 |
| price | DECIMAL(10,2) | 单价 |
| quantity | INT | 数量 |
| total_amount | DECIMAL(10,2) | 小计金额 |
| discount_amount | DECIMAL(10,2) | 优惠金额 |
| pay_amount | DECIMAL(10,2) | 实付金额 |
| create_time | DATETIME | 创建时间 |
| update_time | DATETIME | 更新时间 |
| is_deleted | TINYINT | 逻辑删除 |

#### 订单支付流水表 (order_payment)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| order_id | BIGINT | 订单 ID |
| order_no | VARCHAR(64) | 订单号 |
| payment_no | VARCHAR(64) | 支付流水号 |
| erp_payment_id | VARCHAR(64) | ERP 支付 ID |
| pay_type | VARCHAR(20) | 支付方式 |
| pay_amount | DECIMAL(10,2) | 支付金额 |
| pay_status | TINYINT | 支付状态 |
| pay_time | DATETIME | 支付时间 |
| transaction_id | VARCHAR(100) | 第三方交易流水号 |
| create_time | DATETIME | 创建时间 |
| update_time | DATETIME | 更新时间 |
| is_deleted | TINYINT | 逻辑删除 |

### 索引设计

| 表名 | 索引名 | 字段 | 类型 |
|------|--------|------|------|
| product_category | uk_erp_category_id | erp_category_id | 唯一索引 |
| product_category | idx_status | status | 普通索引 |
| product | uk_erp_goods_id | erp_goods_id | 唯一索引 |
| product | idx_category_id | category_id | 普通索引 |
| product | idx_status | status | 普通索引 |
| product_stock | uk_product_id | product_id | 唯一索引 |
| product_stock | uk_erp_goods_id | erp_goods_id | 唯一索引 |
| order_info | uk_order_no | order_no | 唯一索引 |
| order_info | idx_sync_status | sync_status | 普通索引 |
| order_info | idx_pay_status | pay_status | 普通索引 |
| order_info | idx_create_time | create_time | 普通索引 |
| order_item | idx_order_id | order_id | 普通索引 |
| order_item | idx_product_id | product_id | 普通索引 |
| order_payment | uk_payment_no | payment_no | 唯一索引 |
| order_payment | idx_order_id | order_id | 普通索引 |
| order_payment | idx_pay_status | pay_status | 普通索引 |
