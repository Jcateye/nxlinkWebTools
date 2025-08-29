# 公开API接口文档

## 概述

为了支持没有鉴权能力的第三方系统，我们提供了公开API接口版本。这些接口将API Key、任务ID等参数直接放在URL路径中，无需额外的认证头。

## 基础信息

- **基础URL**: `https://your-domain.com/api/openapi/public`
- **认证方式**: URL参数（API Key在路径中）
- **内容类型**: `application/json`

## 接口列表

### 1. 追加号码接口

将号码批量追加到指定任务中。我们提供两个版本的接口：

#### 版本1：国家代码通过查询参数传递（推荐）

**请求URL**
```
POST /api/openapi/public/{apiKey}/{taskId}/append-numbers?countryCode=86
```

**URL参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| apiKey | string | 是 | API密钥 |
| taskId | string | 是 | 任务ID |

**Query参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| countryCode | string | 是 | 国家代码（如：1 表示美国，86 表示中国） |

**请求体**
```json
{
  "phones": [
    {
      "phone": "1234567890",
      "params": [
        { "name": "姓名", "value": "张三" },
        { "name": "城市", "value": "北京" }
      ]
    },
    {
      "phone": "0987654321",
      "params": [
        { "name": "姓名", "value": "李四" },
        { "name": "城市", "value": "上海" }
      ]
    }
  ]
}
```

#### 版本2：国家代码在URL中

**请求URL**
```
POST /api/openapi/public/{apiKey}/{taskId}/{countryCode}/append-numbers
```

**URL参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| apiKey | string | 是 | API密钥 |
| taskId | string | 是 | 任务ID |
| countryCode | string | 是 | 国家代码（如：1 表示美国，86 表示中国） |

**请求体**
```json
{
  "phones": [
    {
      "phone": "1234567890",
      "params": [
        { "name": "姓名", "value": "张三" },
        { "name": "城市", "value": "北京" }
      ]
    },
    {
      "phone": "0987654321",
      "params": [
        { "name": "姓名", "value": "李四" },
        { "name": "城市", "value": "上海" }
      ]
    }
  ]
}
```

**响应示例**
```json
{
  "code": 200,
  "message": "号码追加成功",
  "data": {
    "successCount": 2,
    "failCount": 0
  },
  "request": {
    "taskId": "123456",
    "countryCode": "86",
    "phoneCount": 2
  }
}
```

**使用示例（cURL）**

版本1（推荐，查询参数方式）：
```bash
curl -X POST "https://your-domain.com/api/openapi/public/your-api-key/123456/append-numbers?countryCode=86" \
  -H "Content-Type: application/json" \
  -d '{
    "phones": [
      {
        "phone": "13800138000",
        "params": [
          { "name": "姓名", "value": "测试用户" }
        ]
      }
    ]
  }'
```

版本2（国家代码在URL中）：
```bash
curl -X POST "https://your-domain.com/api/openapi/public/your-api-key/123456/86/append-numbers" \
  -H "Content-Type: application/json" \
  -d '{
    "phones": [
      {
        "phone": "13800138000",
        "params": [
          { "name": "姓名", "value": "测试用户" }
        ]
      }
    ]
  }'
```

### 2. 获取通话记录接口

获取指定任务的通话记录列表。

**请求URL**
```
GET /api/openapi/public/{apiKey}/{taskId}/call-records
```

**URL参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| apiKey | string | 是 | API密钥 |
| taskId | string | 是 | 任务ID |

**Query参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| pageNumber | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页大小，默认10 |
| status | string | 否 | 状态筛选（可选值：pending, calling, completed, failed） |

**响应示例**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "total": 100,
    "pageNumber": 1,
    "pageSize": 10,
    "records": [
      {
        "contactId": "contact123",
        "phoneNumber": "13800138000",
        "status": "completed",
        "callTime": "2023-12-29 10:30:00",
        "duration": 120,
        "params": [
          { "name": "姓名", "value": "张三" }
        ]
      }
    ]
  }
}
```

**使用示例（cURL）**
```bash
curl -X GET "https://your-domain.com/api/openapi/public/your-api-key/123456/call-records?pageNumber=1&pageSize=20"
```

### 3. 表单数据提交接口

专门为表单系统设计的接口，保持原有的表单数据结构。

**请求URL**
```
POST /api/openapi/public/{apiKey}/{taskId}/form-submission?countryCode=86
```

**URL参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| apiKey | string | 是 | API密钥 |
| taskId | string | 是 | 任务ID |

**Query参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| countryCode | string | 是 | 国家代码（如：1 表示美国，86 表示中国） |

**请求体**
```json
{
  "form": "form_ABC123",          // 表单ID（可选）
  "form_name": "客户信息表",      // 表单名称（可选）
  "entry": {
    "field_5": "13800138000",     // 电话号码（必填）
    "field_2": "张三",            // 姓名（可选）
    "field_6": "zhang@email.com", // 邮箱（可选）
    "field_3": "其他信息1",       // 其他字段（可选）
    "field_4": "其他信息2",       // 其他字段（可选）
    "info_region": {              // 地区信息（可选）
      "province": "北京市",
      "city": "北京市",
      "district": "朝阳区"
    }
  }
}
```

**响应示例**
```json
{
  "code": 200,
  "message": "表单数据处理成功",
  "data": {
    "successCount": 1
  },
  "request": {
    "taskId": "123456",
    "countryCode": "86",
    "phoneNumber": "13800138000",
    "formId": "form_ABC123"
  }
}
```

**使用示例（cURL）**
```bash
curl -X POST "https://your-domain.com/api/openapi/public/your-api-key/123456/form-submission?countryCode=86" \
  -H "Content-Type: application/json" \
  -d '{
    "form": "contact_form",
    "form_name": "联系表单",
    "entry": {
      "field_5": "13800138000",
      "field_2": "李四",
      "field_6": "li@example.com"
    }
  }'
```

### 4. 删除号码接口

从任务中删除指定的号码。

**请求URL**
```
DELETE /api/openapi/public/{apiKey}/{taskId}/{contactId}/delete
```

**URL参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| apiKey | string | 是 | API密钥 |
| taskId | string | 是 | 任务ID |
| contactId | string | 是 | 联系人ID |

**响应示例**
```json
{
  "code": 200,
  "message": "删除成功",
  "data": {
    "deletedCount": 1
  }
}
```

**使用示例（cURL）**
```bash
curl -X DELETE "https://your-domain.com/api/openapi/public/your-api-key/123456/contact123/delete"
```

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | API Key无效或未授权 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 错误响应格式

```json
{
  "code": 401,
  "message": "Invalid API Key",
  "error": "UNAUTHORIZED"
}
```

## 注意事项

1. **安全性**：由于API Key直接暴露在URL中，请确保：
   - 只在HTTPS协议下使用这些接口
   - 定期更换API Key
   - 限制API Key的权限范围
   - 监控API使用情况

2. **性能限制**：
   - 单次追加号码最多支持1000个
   - 请求频率限制：每分钟最多60次请求

3. **数据格式**：
   - 电话号码格式应符合对应国家的格式要求
   - 参数名称和值长度不超过100个字符

4. **最佳实践**：
   - 批量操作时建议分批处理，每批不超过100个号码
   - 实现重试机制处理临时网络错误
   - 记录所有API调用日志便于问题排查

## 迁移指南

如果您正在从原有的Header认证方式迁移到URL参数方式：

1. 将原来的Header中的`X-API-Key`参数移到URL路径中
2. 其他请求参数保持不变
3. 移除认证相关的Header设置

**原方式**：
```bash
curl -X POST "https://your-domain.com/api/openapi/append-numbers" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"taskId": "123456", "countryCode": "86", "phones": [...]}'
```

**新方式**：
```bash
curl -X POST "https://your-domain.com/api/openapi/public/your-api-key/123456/86/append-numbers" \
  -H "Content-Type: application/json" \
  -d '{"phones": [...]}'
```
