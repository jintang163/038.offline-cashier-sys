# 部署文档

## 目录

- [环境要求](#环境要求)
- [后端部署](#后端部署)
- [前端部署](#前端部署)
- [数据库初始化](#数据库初始化)
- [常见问题](#常见问题)

## 环境要求

| 组件 | 版本要求 | 说明 |
|------|----------|------|
| JDK | 1.8+ | 后端运行环境 |
| Maven | 3.6+ | 项目构建工具 |
| MySQL | 8.0+ | 关系型数据库 |
| Redis | 5.0+ | 缓存服务 |
| ActiveMQ | 5.15+ | 消息队列 |
| Node.js | 16+ | 前端构建环境 |
| npm / yarn | 8+ | 包管理工具 |

## 后端部署

### 1. 配置文件说明

后端配置文件位于 `cashier-server/src/main/resources/` 目录下：

- `application.yml` - 主配置文件
- `application-dev.yml` - 开发环境配置
- `application-prod.yml` - 生产环境配置

### 2. 修改配置

根据实际环境修改数据库、Redis、ActiveMQ 等配置：

```yaml
# 数据库配置（示例）
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/cashier_db?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
    username: root
    password: your_password
    driver-class-name: com.mysql.cj.jdbc.Driver

  # Redis配置
  redis:
    host: localhost
    port: 6379
    password: your_redis_password
    database: 0

  # ActiveMQ配置
  activemq:
    broker-url: tcp://localhost:61616
    user: admin
    password: admin
```

### 3. 打包部署

```bash
# 进入后端项目目录
cd cashier-server

# 使用Maven打包
mvn clean package -DskipTests

# 打包完成后，在 target 目录下生成 jar 包
# 例如：cashier-server-1.0.0.jar
```

### 4. 运行服务

```bash
# 方式一：直接运行（开发环境）
java -jar cashier-server-1.0.0.jar

# 方式二：指定配置文件运行
java -jar cashier-server-1.0.0.jar --spring.profiles.active=prod

# 方式三：后台运行（生产环境）
nohup java -jar cashier-server-1.0.0.jar --spring.profiles.active=prod > cashier-server.log 2>&1 &
```

### 5. 验证服务

服务启动后，访问：

- 健康检查：`http://localhost:8080/api/health`
- Swagger文档：`http://localhost:8080/api/doc.html`（如已集成）

## 前端部署

### 1. 环境变量配置

前端环境变量文件位于 `cashier-client/` 目录下：

- `.env` - 通用环境变量
- `.env.development` - 开发环境
- `.env.production` - 生产环境

```bash
# 开发环境
VITE_API_BASE_URL=http://localhost:8080/api

# 生产环境
VITE_API_BASE_URL=/api
```

### 2. 开发模式运行

```bash
# 进入前端项目目录
cd cashier-client

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 3. Electron桌面端运行

```bash
# 开发模式
npm run electron:dev

# 打包Windows版本
npm run electron:build:win

# 打包Mac版本
npm run electron:build:mac

# 打包Linux版本
npm run electron:build:linux
```

### 4. Web端部署

```bash
# 构建生产版本
npm run build

# 构建产物在 dist 目录下
# 将 dist 目录部署到 Nginx 或其他静态文件服务器
```

### 5. Nginx配置示例

```nginx
server {
    listen 80;
    server_name cashier.example.com;

    root /path/to/dist;
    index index.html;

    # 前端页面路由（支持History模式）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API代理
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket支持
    location /ws/ {
        proxy_pass http://localhost:8080/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## 数据库初始化

### 1. 创建数据库

```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS cashier_db 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_general_ci;
```

### 2. 执行初始化脚本

初始化脚本位于：`cashier-server/src/main/resources/sql/init.sql`

```bash
# 方式一：命令行执行
mysql -u root -p cashier_db < init.sql

# 方式二：MySQL客户端执行
# 使用Navicat、DBeaver等工具执行SQL文件
```

### 3. 初始化内容

初始化脚本包含以下内容：

- **商品分类表** (`product_category`) - 5条测试分类数据
- **商品表** (`product`) - 10条测试商品数据
- **商品库存表** (`product_stock`)
- **订单表** (`order_info`)
- **订单明细表** (`order_item`)
- **订单支付流水表** (`order_payment`)

### 4. 验证数据

```sql
-- 查看商品分类
SELECT * FROM product_category;

-- 查看商品列表
SELECT * FROM product WHERE is_deleted = 0 LIMIT 10;
```

## 常见问题

### Q1: 后端启动失败，提示数据库连接失败

**A:** 检查以下几点：
1. MySQL服务是否启动
2. 数据库地址、端口、用户名、密码是否正确
3. 数据库 `cashier_db` 是否已创建
4. 防火墙是否允许数据库端口访问

### Q2: 前端无法访问后端API

**A:** 检查以下几点：
1. 后端服务是否正常启动
2. 前端 `VITE_API_BASE_URL` 配置是否正确
3. 浏览器控制台是否有跨域错误（CORS）
4. 检查后端CORS配置

### Q3: 离线数据不同步

**A:** 检查以下几点：
1. 收银端网络连接是否正常
2. WebSocket连接是否建立成功
3. 离线队列中是否有待同步数据
4. 检查服务端同步日志

### Q4: Electron打包失败

**A:** 常见原因：
1. 网络问题导致依赖下载失败（可配置镜像源）
2. 系统缺少必要的构建依赖
3. 清理 `node_modules` 后重新安装依赖
