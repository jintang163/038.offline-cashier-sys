# 接口文档

## 目录

- [通用说明](#通用说明)
- [认证接口](#认证接口)
- [商品接口](#商品接口)
- [商品分类接口](#商品分类接口)
- [订单接口](#订单接口)
- [ERP对接接口](#erp对接接口)
- [WebSocket接口](#websocket接口)
- [错误码说明](#错误码说明)

## 通用说明

### 基础地址

- 开发环境：`http://localhost:8080/api`
- 生产环境：`/api`

### 请求方式

所有接口均采用 RESTful 风格，使用 HTTP 方法表示操作类型：

| 方法 | 说明 |
|------|------|
| GET | 查询操作 |
| POST | 新增操作 |
| PUT | 更新操作 |
| DELETE | 删除操作 |

### 请求头

```
Content-Type: application/json
Authorization: Bearer {token}
```

### 响应格式

所有接口返回统一格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | Integer | 响应码，0表示成功，非0表示失败 |
| message | String | 响应消息 |
| data | Object | 响应数据 |

### 分页参数

分页查询接口通用参数：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | Integer | 1 | 页码 |
| size | Integer | 10 | 每页数量 |

### 分页响应

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "records": [],
    "total": 100,
    "size": 10,
    "current": 1,
    "pages": 10
  }
}
```

## 认证接口

### 登录

**接口地址：** `POST /auth/login`

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | String | 是 | 用户名 |
| password | String | 是 | 密码 |

**请求示例：**

```json
{
  "username": "admin",
  "password": "123456"
}
```

**响应示例：**

```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userInfo": {
      "id": 1,
      "username": "admin",
      "name": "管理员",
      "role": "admin"
    }
  }
}
```

**响应字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| token | String | 访问令牌（JWT格式） |
| userInfo | Object | 用户信息 |

### 退出登录

**接口地址：** `POST /auth/logout`

**请求头：** 需要携带有效的 Token

**响应示例：**

```json
{
  "code": 0,
  "message": "退出成功"
}
```

### 获取当前用户信息

**接口地址：** `GET /auth/userinfo`

**请求头：** 需要携带有效的 Token

**响应示例：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "username": "admin",
    "name": "管理员",
    "role": "admin",
    "avatar": ""
  }
}
```

## 商品接口

### 商品列表

**接口地址：** `GET /product/list`

**请求头：** 需要携带有效的 Token

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | Integer | 否 | 页码，默认1 |
| size | Integer | 否 | 每页数量，默认10 |
| categoryId | Long | 否 | 分类ID |
| keyword | String | 否 | 搜索关键词 |
| status | Integer | 否 | 状态：0下架 1上架 |

**响应示例：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "records": [
      {
        "id": 1,
        "erpGoodsId": "G001",
        "productName": "宫保鸡丁",
        "categoryId": 1,
        "categoryName": "热菜",
        "price": 38.00,
        "originalPrice": 42.00,
        "unit": "份",
        "image": "",
        "description": "",
        "stock": 50,
        "status": 1,
        "sort": 1
      }
    ],
    "total": 10,
    "size": 10,
    "current": 1,
    "pages": 1
  }
}
```

### 商品详情

**接口地址：** `GET /product/{id}`

**请求头：** 需要携带有效的 Token

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Long | 是 | 商品ID |

**响应示例：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "erpGoodsId": "G001",
    "productName": "宫保鸡丁",
    "categoryId": 1,
    "categoryName": "热菜",
    "price": 38.00,
    "originalPrice": 42.00,
    "unit": "份",
    "image": "",
    "description": "",
    "stock": 50,
    "status": 1,
    "sort": 1
  }
}
```

### 新增商品

**接口地址：** `POST /product`

**请求头：** 需要携带有效的 Token

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| erpGoodsId | String | 否 | ERP商品ID |
| productName | String | 是 | 商品名称 |
| categoryId | Long | 否 | 分类ID |
| categoryName | String | 否 | 分类名称 |
| price | BigDecimal | 是 | 售价 |
| originalPrice | BigDecimal | 否 | 原价 |
| unit | String | 否 | 单位 |
| image | String | 否 | 商品图片 |
| description | String | 否 | 商品描述 |
| stock | Integer | 否 | 库存数量 |
| status | Integer | 否 | 状态：0下架 1上架 |
| sort | Integer | 否 | 排序 |

### 更新商品

**接口地址：** `PUT /product`

**请求头：** 需要携带有效的 Token

**请求参数：** 同新增商品，需传入商品 `id`

### 删除商品

**接口地址：** `DELETE /product/{id}`

**请求头：** 需要携带有效的 Token

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Long | 是 | 商品ID |

### 商品上架

**接口地址：** `PUT /product/{id}/on-sale`

**请求头：** 需要携带有效的 Token

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Long | 是 | 商品ID |

### 商品下架

**接口地址：** `PUT /product/{id}/off-sale`

**请求头：** 需要携带有效的 Token

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Long | 是 | 商品ID |

### 批量上架

**接口地址：** `PUT /product/batch-on-sale`

**请求头：** 需要携带有效的 Token

**请求参数：**

```json
[1, 2, 3]
```

### 批量下架

**接口地址：** `PUT /product/batch-off-sale`

**请求头：** 需要携带有效的 Token

**请求参数：**

```json
[1, 2, 3]
```

### 查询商品库存

**接口地址：** `GET /product/{id}/stock`

**请求头：** 需要携带有效的 Token

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Long | 是 | 商品ID |

**响应示例：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "productId": 1,
    "erpGoodsId": "G001",
    "stock": 50,
    "frozenStock": 0,
    "availableStock": 50
  }
}
```

### 更新商品库存

**接口地址：** `PUT /product/{id}/stock`

**请求头：** 需要携带有效的 Token

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Long | 是 | 商品ID |

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock | Integer | 是 | 库存数量 |

### 同步全部商品

**接口地址：** `GET /product/sync-all`

**请求头：** 需要携带有效的 Token

**说明：** 从ERP同步所有商品和库存数据

## 商品分类接口

### 分类列表

**接口地址：** `GET /product/category/list`

**请求头：** 需要携带有效的 Token

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | Integer | 否 | 页码，默认1 |
| size | Integer | 否 | 每页数量，默认10 |
| status | Integer | 否 | 状态：0禁用 1启用 |

**响应示例：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "records": [
      {
        "id": 1,
        "erpCategoryId": "CAT001",
        "categoryName": "热菜",
        "sort": 1,
        "status": 1
      }
    ],
    "total": 5,
    "size": 10,
    "current": 1,
    "pages": 1
  }
}
```

### 分类详情

**接口地址：** `GET /product/category/{id}`

**请求头：** 需要携带有效的 Token

### 新增分类

**接口地址：** `POST /product/category`

**请求头：** 需要携带有效的 Token

### 更新分类

**接口地址：** `PUT /product/category`

**请求头：** 需要携带有效的 Token

### 删除分类

**接口地址：** `DELETE /product/category/{id}`

**请求头：** 需要携带有效的 Token

## 订单接口

### 订单列表

**接口地址：** `GET /order/list`

**请求头：** 需要携带有效的 Token

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | Integer | 否 | 页码，默认1 |
| size | Integer | 否 | 每页数量，默认10 |
| orderStatus | Integer | 否 | 订单状态 |
| payStatus | Integer | 否 | 支付状态 |
| syncStatus | Integer | 否 | 同步状态 |
| keyword | String | 否 | 搜索关键词（订单号） |

**订单状态说明：**

| 值 | 说明 |
|----|------|
| 1 | 待支付 |
| 2 | 已支付 |
| 3 | 已完成 |
| 4 | 已取消 |

**支付状态说明：**

| 值 | 说明 |
|----|------|
| 0 | 未支付 |
| 1 | 已支付 |

**同步状态说明：**

| 值 | 说明 |
|----|------|
| 0 | 未同步 |
| 1 | 已同步 |
| 2 | 同步失败 |

### 订单详情

**接口地址：** `GET /order/{id}`

**请求头：** 需要携带有效的 Token

### 根据订单号查询

**接口地址：** `GET /order/no/{orderNo}`

**请求头：** 需要携带有效的 Token

### 订单明细

**接口地址：** `GET /order/{id}/items`

**请求头：** 需要携带有效的 Token

### 订单支付流水

**接口地址：** `GET /order/{id}/payments`

**请求头：** 需要携带有效的 Token

### 创建订单

**接口地址：** `POST /order`

**请求头：** 需要携带有效的 Token

**请求参数：**

```json
{
  "items": [
    {
      "productId": 1,
      "productName": "宫保鸡丁",
      "price": 38.00,
      "quantity": 2,
      "totalAmount": 76.00
    }
  ],
  "cashierId": 1,
  "cashierName": "管理员",
  "remark": "不要辣"
}
```

**响应示例：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "orderNo": "ORD2024010100001",
    "totalAmount": 76.00,
    "discountAmount": 0.00,
    "payAmount": 76.00,
    "payStatus": 0,
    "orderStatus": 1,
    "syncStatus": 0
  }
}
```

### 订单支付

**接口地址：** `POST /order/{id}/pay`

**请求头：** 需要携带有效的 Token

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Long | 是 | 订单ID |

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| payType | String | 是 | 支付方式 |
| payAmount | BigDecimal | 是 | 支付金额 |
| transactionId | String | 否 | 第三方交易流水号 |

**支付方式说明：**

| 值 | 说明 |
|----|------|
| cash | 现金 |
| wechat | 微信支付 |
| alipay | 支付宝 |
| member | 会员卡 |

### 更新同步状态

**接口地址：** `PUT /order/{id}/sync-status`

**请求头：** 需要携带有效的 Token

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Long | 是 | 订单ID |

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| syncStatus | Integer | 是 | 同步状态 |
| errorMessage | String | 否 | 错误信息 |

### 重试同步订单

**接口地址：** `POST /order/{id}/retry`

**请求头：** 需要携带有效的 Token

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Long | 是 | 订单ID |

### 获取未同步订单

**接口地址：** `GET /order/unsynced`

**请求头：** 需要携带有效的 Token

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| maxRetry | Integer | 否 | 5 | 最大重试次数 |
| limit | Integer | 否 | 100 | 最大返回数量 |

### 批量创建订单

**接口地址：** `POST /order/batch-create`

**请求头：** 需要携带有效的 Token

**说明：** 用于离线订单批量同步

## ERP对接接口

### ERP推送商品

**接口地址：** `POST /erp/push/products`

**请求头：** 需要ERP专用认证

**请求参数：**

```json
[
  {
    "erpGoodsId": "G001",
    "productName": "宫保鸡丁",
    "categoryId": 1,
    "price": 38.00,
    "stock": 50,
    "status": 1
  }
]
```

### ERP推送分类

**接口地址：** `POST /erp/push/categories`

**请求头：** 需要ERP专用认证

### ERP推送库存

**接口地址：** `POST /erp/push/stock`

**请求头：** 需要ERP专用认证

### ERP订单回调

**接口地址：** `POST /erp/order/callback`

**请求头：** 需要ERP专用认证

**说明：** ERP处理完订单后回调通知

### 触发商品同步

**接口地址：** `POST /erp/sync/products`

**请求头：** 需要携带有效的 Token

**说明：** 主动从ERP拉取商品数据

### 触发库存同步

**接口地址：** `POST /erp/sync/stocks`

**请求头：** 需要携带有效的 Token

**说明：** 主动从ERP拉取库存数据

### 触发订单同步

**接口地址：** `POST /erp/sync/orders`

**请求头：** 需要携带有效的 Token

**说明：** 主动将未同步订单推送到ERP

### 同步单个订单

**接口地址：** `POST /erp/sync/order/{orderId}`

**请求头：** 需要携带有效的 Token

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderId | Long | 是 | 订单ID |

## WebSocket接口

### 连接地址

```
ws://{host}:{port}/ws/{token}
```

### 消息格式

```json
{
  "type": "message_type",
  "data": {}
}
```

### 消息类型

| 类型 | 说明 |
|------|------|
| product_update | 商品信息更新 |
| stock_update | 库存更新 |
| order_sync | 订单同步状态更新 |
| erp_sync | ERP同步通知 |
| ping | 心跳检测 |
| pong | 心跳响应 |

### 商品更新消息示例

```json
{
  "type": "product_update",
  "data": {
    "productId": 1,
    "productName": "宫保鸡丁",
    "price": 38.00,
    "status": 1
  }
}
```

### 库存更新消息示例

```json
{
  "type": "stock_update",
  "data": {
    "productId": 1,
    "stock": 45,
    "availableStock": 45
  }
}
```

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| -1 | 通用错误 |
| 401 | 未授权/登录过期 |
| 403 | 没有权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
| 1001 | 参数错误 |
| 1002 | 用户名或密码错误 |
| 1003 | Token已过期 |
| 1004 | Token无效 |
| 2001 | 商品不存在 |
| 2002 | 库存不足 |
| 3001 | 订单不存在 |
| 3002 | 订单状态异常 |
| 3003 | 订单已支付 |
| 4001 | ERP同步失败 |
