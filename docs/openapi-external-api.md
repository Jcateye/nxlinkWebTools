# OpenAPI外部接口文档 - 多租户版本

## 概述

本文档描述了如何通过我们的API接口调用nxlink OpenAPI平台的追加号码功能。系统支持多租户架构，每个外部平台可以使用独立的API Key和OpenAPI配置。

## 多租户架构

### 租户隔离特性
- **独立API Key**: 每个外部平台拥有唯一的API Key
- **独立OpenAPI配置**: 每个API Key对应独立的nxlink OpenAPI认证信息
- **自定义别名**: 支持为API Key设置友好的别名和描述
- **配置隔离**: 不同租户的配置互不影响

### 租户配置示例
```json
{
  "apiKey": "platform-a-key-12345",
  "alias": "客户平台A",
  "description": "A公司的外呼系统",
  "openapi": {
    "accessKey": "AK-xxxxx-A",
    "accessSecret": "secret-A",
    "bizType": "8",
    "baseUrl": "https://api-westus.nxlink.ai"
  }
}
```

## 认证方式

### API Key认证

所有请求都需要在请求头中包含有效的API Key：

```http
x-api-key: your-api-key
```

或者使用Authorization Bearer Token：

```http
Authorization: Bearer your-api-key
```

### 自动租户识别
系统会根据提供的API Key自动：
1. 验证API Key的有效性
2. 识别对应的租户配置
3. 使用租户专属的OpenAPI配置调用nxlink平台

## 接口列表

### 1. 追加号码

**接口地址**: `POST /api/openapi/append-numbers`

**功能描述**: 向指定任务批量追加号码

**请求头**:
```http
Content-Type: application/json
x-api-key: your-api-key
```

**请求参数**:
```json
{
  "taskId": "string",           // 必填：任务ID
  "phoneNumbers": [             // 必填：号码列表
    "13800000001",              // 简单格式：只有号码
    {                           // 复杂格式：号码+参数
      "phoneNumber": "13800000002",
      "params": [
        {
          "name": "姓名",
          "value": "张三"
        },
        {
          "name": "备注", 
          "value": "VIP客户"
        }
      ]
    }
  ],
  "autoFlowId": 123,            // 可选：机器人ID
  "countryCode": "86",          // 可选：国家码
  "params": [                   // 可选：全局参数（当号码为简单格式时使用）
    {
      "name": "默认备注",
      "value": "批量导入"
    }
  ]
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "Successfully processed 2 numbers. Success: 2, Failed: 0",
  "data": {
    "taskId": "task-123",
    "totalCount": 2,
    "successCount": 2,
    "failCount": 0,
    "results": [
      {
        "phoneNumber": "13800000001",
        "success": true,
        "contactId": "9af09d3a-51a6-66c2-109b-8286760a766e",
        "response": {
          "code": 0,
          "message": "success"
        }
      },
      {
        "phoneNumber": "13800000002", 
        "success": true,
        "contactId": "7bf08c2b-42b5-55d1-208a-7175649a655d",
        "response": {
          "code": 0,
          "message": "success"
        }
      }
    ]
  },
  "apiKey": "demo-api-key-1"
}
```

### 2. 服务状态检查

**接口地址**: `GET /api/openapi/status`

**功能描述**: 检查OpenAPI服务状态

**请求头**:
```http
x-api-key: your-api-key
```

**响应示例**:
```json
{
  "code": 200,
  "message": "OpenAPI service is running",
  "data": {
    "service": "nxlink-openapi-proxy",
    "version": "1.0.0",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "apiKey": "demo-api-key-1",
    "hasOpenApiConfig": true
  }
}
```

## 错误码说明

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 400 | 请求参数错误 | 检查请求参数格式和必填字段 |
| 401 | 缺少API Key | 在请求头中添加x-api-key |
| 403 | API Key无效 | 使用有效的API Key |
| 500 | 服务器内部错误 | 联系管理员或检查服务配置 |

## 使用示例

### cURL示例

```bash
# 追加号码
curl -X POST http://localhost:8001/api/openapi/append-numbers \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo-api-key-1" \
  -d '{
    "taskId": "task-123",
    "phoneNumbers": [
      "13800000001",
      {
        "phoneNumber": "13800000002",
        "params": [
          {"name": "姓名", "value": "张三"},
          {"name": "备注", "value": "VIP客户"}
        ]
      }
    ],
    "autoFlowId": 123,
    "countryCode": "86"
  }'

# 检查服务状态
curl -X GET http://localhost:8001/api/openapi/status \
  -H "x-api-key: demo-api-key-1"
```

### JavaScript示例

```javascript
// 追加号码
async function appendNumbers(taskId, phoneNumbers) {
  const response = await fetch('/api/openapi/append-numbers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'demo-api-key-1'
    },
    body: JSON.stringify({
      taskId,
      phoneNumbers,
      autoFlowId: 123,
      countryCode: '86'
    })
  });
  
  const result = await response.json();
  return result;
}

// 使用示例
appendNumbers('task-123', [
  '13800000001',
  {
    phoneNumber: '13800000002',
    params: [
      { name: '姓名', value: '张三' },
      { name: '备注', value: 'VIP客户' }
    ]
  }
]).then(result => {
  console.log('追加结果:', result);
});
```

### 2. 获取API状态

**接口地址**: `GET /api/openapi/status`

**功能描述**: 获取当前API Key的状态和配置信息

**请求头**:
```http
x-api-key: your-api-key
```

**响应示例**:
```json
{
  "code": 200,
  "message": "OpenAPI service is running",
  "data": {
    "service": "nxlink-openapi-proxy",
    "version": "2.0.0",
    "timestamp": "2025-01-27T10:30:00.000Z",
    "apiKey": "demo-api-key-1",
    "apiKeyAlias": "客户平台1",
    "apiKeyDescription": "第一个客户平台的API Key",
    "hasOpenApiConfig": true,
    "openApiBaseUrl": "https://api-westus.nxlink.ai",
    "openApiBizType": "8"
  }
}
```

### 3. 获取所有API Keys信息

**接口地址**: `GET /api/openapi/keys`

**功能描述**: 获取所有可用的API Keys信息（不需要认证）

**响应示例**:
```json
{
  "code": 200,
  "message": "Available API Keys",
  "data": {
    "totalKeys": 2,
    "keys": [
      {
        "alias": "客户平台1",
        "description": "第一个客户平台的API Key",
        "hasOpenApiConfig": true,
        "openApiBaseUrl": "https://api-westus.nxlink.ai",
        "bizType": "8"
      },
      {
        "alias": "客户平台2",
        "description": "第二个客户平台的API Key",
        "hasOpenApiConfig": true,
        "openApiBaseUrl": "https://api-westus.nxlink.ai",
        "bizType": "8"
      }
    ]
  }
}
```

## 多租户配置说明

### 环境变量配置

在服务器端需要配置以下环境变量：

```bash
# 默认OpenAPI配置（向后兼容）
OPENAPI_ACCESS_KEY=your-default-openapi-access-key
OPENAPI_ACCESS_SECRET=your-default-openapi-access-secret
OPENAPI_BIZ_TYPE=8

# 租户1配置
EXTERNAL_API_KEY_1=platform-a-key-12345
EXTERNAL_API_KEY_1_ALIAS=客户平台A
EXTERNAL_API_KEY_1_DESC=A公司的外呼系统
EXTERNAL_API_KEY_1_OPENAPI_ACCESS_KEY=AK-xxxxx-A
EXTERNAL_API_KEY_1_OPENAPI_ACCESS_SECRET=secret-A
EXTERNAL_API_KEY_1_OPENAPI_BIZ_TYPE=8
EXTERNAL_API_KEY_1_OPENAPI_BASE_URL=https://api-westus.nxlink.ai

# 租户2配置
EXTERNAL_API_KEY_2=platform-b-key-67890
EXTERNAL_API_KEY_2_ALIAS=客户平台B
EXTERNAL_API_KEY_2_DESC=B公司的营销系统
EXTERNAL_API_KEY_2_OPENAPI_ACCESS_KEY=AK-xxxxx-B
EXTERNAL_API_KEY_2_OPENAPI_ACCESS_SECRET=secret-B
EXTERNAL_API_KEY_2_OPENAPI_BIZ_TYPE=8
EXTERNAL_API_KEY_2_OPENAPI_BASE_URL=https://api-westus.nxlink.ai
```

### 前端配置

在前端项目中可以配置默认的OpenAPI认证信息：

```bash
# .env文件
VITE_OPENAPI_ACCESS_KEY=your-openapi-access-key
VITE_OPENAPI_ACCESS_SECRET=your-openapi-access-secret
VITE_OPENAPI_BIZ_TYPE=8
```

## 注意事项

1. **API Key安全**: 请妥善保管API Key，不要在客户端代码中硬编码
2. **请求频率**: 建议控制请求频率，避免过于频繁的调用
3. **错误处理**: 请实现适当的错误处理和重试机制
4. **联系ID唯一性**: 系统会自动为每个号码生成唯一的contactId，避免重复
5. **参数格式**: 支持两种号码格式，简单格式（字符串）和复杂格式（对象）

## 技术支持

如有问题请联系技术支持团队或查看项目文档。
