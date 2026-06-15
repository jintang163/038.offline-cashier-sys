# 离线餐饮收银系统

一个支持离线运行的餐饮收银系统，能够与 ERP 双向同步数据。支持断网开单、本地库存扣减、网络恢复后自动同步等功能。

## ✨ 功能特性

### 核心功能

- **离线收银开单** - 断网时正常开单，数据写入本地数据库，联网后自动同步
- **商品管理** - 商品分类、商品信息、库存管理，支持 ERP 双向同步
- **订单管理** - 订单创建、支付、查询、状态流转，支持多种支付方式
- **ERP 对接** - 商品/库存同步、订单上传、回调通知，支持主动推送和定时拉取
- **实时通信** - WebSocket 实时推送商品、库存、订单状态变更

### 业务特性

- 🛒 **收银台** - 快捷扫码、商品搜索、购物车管理、一键结算
- 💳 **多支付方式** - 支持现金、微信支付、支付宝、会员卡等
- 📱 **微信小程序** - 扫码点餐、在线下单、订单查询
- 📊 **订单查询** - 历史订单、订单详情、同步状态追踪
- 🔄 **离线同步** - 断网续传、重试机制、手动重传
- 🔔 **实时通知** - 商品更新、库存变动、订单状态实时推送

### 技术特性

- ⚡ **高性能** - 本地数据库缓存，响应迅速
- 🔒 **安全可靠** - JWT 认证、权限控制、数据加密
- 📦 **可扩展** - 模块化设计，易于扩展新功能
- 🎨 **美观界面** - 现代化 UI 设计，操作简单直观

## 🏗️ 系统架构

### 整体架构

系统采用前后端分离架构，包含四个主要部分：

- **后端服务** (cashier-server) - Spring Boot 后端，提供 REST API 和 WebSocket 服务
- **PC 收银端** (cashier-client) - Electron + React 桌面应用，支持离线运行
- **微信小程序** (cashier-miniapp) - 微信原生小程序，扫码点餐
- **ERP 对接** - 双向数据同步，支持主动推送和被动拉取

### 技术栈

#### 后端技术栈

| 技术 | 说明 |
|------|------|
| Spring Boot 2.7.x | 应用框架 |
| MyBatis Plus | ORM 框架 |
| MySQL 8.0 | 关系型数据库 |
| Redis | 缓存服务 |
| ActiveMQ | 消息队列 |
| WebSocket | 实时通信 |
| JWT | 身份认证 |

#### 前端技术栈（PC 收银端）

| 技术 | 说明 |
|------|------|
| Electron | 桌面应用框架 |
| React 18 | UI 框架 |
| Ant Design 5 | UI 组件库 |
| Dexie.js | IndexedDB 封装（本地数据库） |
| Axios | HTTP 客户端 |
| Vite | 构建工具 |

#### 小程序技术栈

| 技术 | 说明 |
|------|------|
| 微信小程序原生 | 小程序框架 |
| 原生 API | 网络、存储等 |

## 📁 项目结构

```
offline-cashier-sys/
├── cashier-server/          # 后端服务
│   ├── src/
│   │   └── main/
│   │       ├── java/com/cashier/server/
│   │       │   ├── common/       # 公共类
│   │       │   ├── config/       # 配置类
│   │       │   ├── controller/   # 控制器
│   │       │   ├── entity/       # 实体类
│   │       │   ├── mapper/       # 数据访问层
│   │       │   ├── service/      # 业务逻辑层
│   │       │   └── websocket/    # WebSocket 相关
│   │       └── resources/
│   │           ├── sql/          # SQL 脚本
│   │           ├── application.yml
│   │           ├── application-dev.yml
│   │           └── application-prod.yml
│   └── pom.xml
│
├── cashier-client/          # PC 收银端（Electron + React）
│   ├── electron/            # Electron 主进程
│   │   ├── database/        # SQLite 数据库
│   │   ├── main.js
│   │   └── preload.js
│   ├── src/
│   │   ├── api/             # API 请求
│   │   ├── components/      # 通用组件
│   │   ├── db/              # 本地数据库（Dexie.js）
│   │   ├── hooks/           # 自定义 Hooks
│   │   ├── pages/           # 页面组件
│   │   ├── services/        # 业务服务
│   │   ├── utils/           # 工具函数
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env                 # 通用环境变量
│   ├── .env.development     # 开发环境变量
│   ├── .env.production      # 生产环境变量
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── cashier-miniapp/         # 微信小程序
│   ├── components/          # 组件
│   ├── pages/               # 页面
│   ├── utils/               # 工具函数
│   ├── app.js
│   ├── app.json
│   └── app.wxss
│
├── docs/                    # 项目文档
│   ├── DEPLOYMENT.md        # 部署文档
│   ├── API_DOC.md           # 接口文档
│   └── ARCHITECTURE.md      # 架构设计文档
│
└── README.md
```

## 🚀 快速开始

### 环境准备

确保你已经安装了以下环境：

- **JDK 1.8+** - 后端运行环境
- **Maven 3.6+** - 后端构建工具
- **MySQL 8.0+** - 数据库
- **Redis 5.0+** - 缓存（可选）
- **ActiveMQ 5.15+** - 消息队列（可选）
- **Node.js 16+** - 前端运行环境
- **npm 8+** - 包管理工具

### 一、数据库初始化

1. 创建数据库

```sql
CREATE DATABASE IF NOT EXISTS cashier_db 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_general_ci;
```

2. 执行初始化脚本

```bash
mysql -u root -p cashier_db < cashier-server/src/main/resources/sql/init.sql
```

### 二、后端启动

1. 进入后端目录

```bash
cd cashier-server
```

2. 修改配置文件

根据实际环境修改 `src/main/resources/application-dev.yml` 中的数据库、Redis、ActiveMQ 配置。

3. 启动服务

```bash
# 使用 Maven 启动
mvn spring-boot:run

# 或者打包后运行
mvn clean package -DskipTests
java -jar target/cashier-server-1.0.0.jar
```

4. 验证服务

访问 `http://localhost:8080/api/health` 检查服务是否正常启动。

### 三、前端启动（PC 收银端）

1. 进入前端目录

```bash
cd cashier-client
```

2. 安装依赖

```bash
npm install
```

3. 配置环境变量

环境变量文件已预置：
- `.env.development` - 开发环境 API 地址
- `.env.production` - 生产环境 API 地址
- `.env` - 通用环境变量（应用名称等）

4. 启动开发服务器

```bash
# Web 开发模式
npm run dev

# Electron 桌面开发模式
npm run electron:dev
```

5. 访问应用

- Web 模式：浏览器打开 `http://localhost:5173`
- Electron 模式：自动打开桌面应用

6. 默认登录账号

```
用户名：admin
密码：123456
```

### 四、小程序启动

1. 使用微信开发者工具打开 `cashier-miniapp` 目录

2. 修改 `utils/request.js` 中的 API 地址

3. 点击编译预览

## 📖 模块介绍

### 后端模块

| 模块 | 路径 | 说明 |
|------|------|------|
| 认证模块 | `controller/auth/` | 用户登录、Token 管理 |
| 商品模块 | `controller/product/` | 商品 CRUD、分类、库存 |
| 订单模块 | `controller/order/` | 订单创建、支付、查询 |
| ERP 模块 | `controller/erp/` | ERP 数据同步、推送接收 |
| WebSocket | `websocket/` | 实时消息推送 |

### 前端模块（PC 收银端）

| 模块 | 路径 | 说明 |
|------|------|------|
| 收银台 | `pages/Cashier.jsx` | 商品浏览、购物车、结算 |
| 订单管理 | `pages/Orders.jsx` | 订单查询、订单详情 |
| 系统设置 | `pages/Settings.jsx` | 系统配置、同步设置 |
| 登录页 | `pages/Login.jsx` | 用户登录 |
| API 服务 | `api/request.js` | HTTP 请求封装 |
| 本地数据库 | `db/dexie.js` | IndexedDB 封装 |
| 同步服务 | `services/syncService.js` | 离线数据同步 |
| 认证工具 | `utils/auth.js` | Token 和用户信息管理 |

### 小程序模块

| 模块 | 路径 | 说明 |
|------|------|------|
| 首页 | `pages/index/` | 商品列表、分类浏览 |
| 购物车 | `pages/cart/` | 购物车管理 |
| 订单确认 | `pages/order-confirm/` | 确认订单、支付 |
| 订单列表 | `pages/orders/` | 历史订单 |
| 订单详情 | `pages/order-detail/` | 订单详情 |

## 🔧 开发说明

### 环境变量

前端环境变量配置：

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| VITE_API_BASE_URL | API 基础地址 | - |
| VITE_APP_TITLE | 应用标题 | 离线收银系统 |

### API 调用

```javascript
import apiService from './api/request'

// 登录
const res = await apiService.login(username, password)

// 获取商品列表
const res = await apiService.getProducts({ page: 1, size: 10 })

// 创建订单
const res = await apiService.createOrder(orderData)
```

### 认证相关

```javascript
import {
  getToken,
  setToken,
  removeToken,
  getUserInfo,
  setUserInfo,
  removeUserInfo,
  isLoggedIn,
} from './utils/auth'

// 判断是否登录
if (isLoggedIn()) {
  // 已登录
}
```

### 本地数据库

使用 Dexie.js 操作 IndexedDB：

```javascript
import db from './db/dexie'

// 获取商品列表
const products = await db.getProducts({ categoryId: 1 })

// 创建订单
const order = await db.createOrder(orderData)

// 添加到离线队列
await db.addOfflineQueue(action, data)
```

## 📚 文档

详细文档请参考：

- [部署文档](docs/DEPLOYMENT.md) - 后端部署、前端部署、数据库初始化
- [接口文档](docs/API_DOC.md) - 商品、订单、ERP 对接、认证等接口
- [架构设计文档](docs/ARCHITECTURE.md) - 整体架构、数据流、离线同步机制

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
