# 多租户OpenAPI使用示例

## 概述

本文档提供了多租户OpenAPI系统的详细使用示例，展示如何为不同的外部平台配置独立的API Key和OpenAPI认证信息。

## 配置示例

### 1. 环境变量配置

```bash
# 租户A - 电商平台
EXTERNAL_API_KEY_1=ecommerce-platform-key-abc123
EXTERNAL_API_KEY_1_ALIAS=电商平台A
EXTERNAL_API_KEY_1_DESC=某电商公司的营销外呼系统
EXTERNAL_API_KEY_1_OPENAPI_ACCESS_KEY=AK-764887602601150724-2786
EXTERNAL_API_KEY_1_OPENAPI_ACCESS_SECRET=0de4a159402a4e3494f76669ac92d6e6
EXTERNAL_API_KEY_1_OPENAPI_BIZ_TYPE=8
EXTERNAL_API_KEY_1_OPENAPI_BASE_URL=https://api-westus.nxlink.ai

# 租户B - 金融平台
EXTERNAL_API_KEY_2=finance-platform-key-xyz789
EXTERNAL_API_KEY_2_ALIAS=金融平台B
EXTERNAL_API_KEY_2_DESC=某金融公司的客户服务系统
EXTERNAL_API_KEY_2_OPENAPI_ACCESS_KEY=AK-123456789012345678-9999
EXTERNAL_API_KEY_2_OPENAPI_ACCESS_SECRET=abcdef123456789012345678901234567
EXTERNAL_API_KEY_2_OPENAPI_BIZ_TYPE=8
EXTERNAL_API_KEY_2_OPENAPI_BASE_URL=https://api-westus.nxlink.ai
```

### 2. 项目配置文件

```typescript
// config/project.config.ts
export const PROJECT_CONFIG = {
  // ... 其他配置 ...
  
  externalApiKeys: [
    {
      apiKey: process.env.EXTERNAL_API_KEY_1 || 'demo-api-key-1',
      alias: process.env.EXTERNAL_API_KEY_1_ALIAS || '电商平台A',
      description: process.env.EXTERNAL_API_KEY_1_DESC || '电商公司的营销外呼系统',
      openapi: {
        accessKey: process.env.EXTERNAL_API_KEY_1_OPENAPI_ACCESS_KEY || '',
        accessSecret: process.env.EXTERNAL_API_KEY_1_OPENAPI_ACCESS_SECRET || '',
        bizType: process.env.EXTERNAL_API_KEY_1_OPENAPI_BIZ_TYPE || '8',
        baseUrl: process.env.EXTERNAL_API_KEY_1_OPENAPI_BASE_URL || 'https://api-westus.nxlink.ai'
      }
    },
    {
      apiKey: process.env.EXTERNAL_API_KEY_2 || 'demo-api-key-2',
      alias: process.env.EXTERNAL_API_KEY_2_ALIAS || '金融平台B',
      description: process.env.EXTERNAL_API_KEY_2_DESC || '金融公司的客户服务系统',
      openapi: {
        accessKey: process.env.EXTERNAL_API_KEY_2_OPENAPI_ACCESS_KEY || '',
        accessSecret: process.env.EXTERNAL_API_KEY_2_OPENAPI_ACCESS_SECRET || '',
        bizType: process.env.EXTERNAL_API_KEY_2_OPENAPI_BIZ_TYPE || '8',
        baseUrl: process.env.EXTERNAL_API_KEY_2_OPENAPI_BASE_URL || 'https://api-westus.nxlink.ai'
      }
    }
  ]
};
```

## 使用示例

### 1. 电商平台调用示例

```javascript
// 电商平台的调用代码
const axios = require('axios');

const API_BASE_URL = 'https://your-domain.com';
const API_KEY = 'ecommerce-platform-key-abc123';

async function appendCustomerNumbers(taskId, customers) {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/openapi/append-numbers`, {
      taskId: taskId,
      phoneNumbers: customers.map(customer => ({
        phoneNumber: customer.phone,
        params: [
          { name: '客户姓名', value: customer.name },
          { name: '订单号', value: customer.orderId },
          { name: '商品名称', value: customer.productName },
          { name: '优惠金额', value: customer.discount }
        ]
      })),
      autoFlowId: 12345,
      countryCode: '86'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    });

    console.log('电商平台追加号码结果:', response.data);
    return response.data;
  } catch (error) {
    console.error('电商平台调用失败:', error.response?.data || error.message);
    throw error;
  }
}

// 使用示例
const customers = [
  {
    phone: '13800000001',
    name: '张三',
    orderId: 'ORDER-001',
    productName: '智能手机',
    discount: '100元'
  },
  {
    phone: '13800000002',
    name: '李四',
    orderId: 'ORDER-002',
    productName: '笔记本电脑',
    discount: '200元'
  }
];

appendCustomerNumbers('ecommerce-task-001', customers);
```

### 2. 金融平台调用示例

```javascript
// 金融平台的调用代码
const axios = require('axios');

const API_BASE_URL = 'https://your-domain.com';
const API_KEY = 'finance-platform-key-xyz789';

async function appendClientNumbers(taskId, clients) {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/openapi/append-numbers`, {
      taskId: taskId,
      phoneNumbers: clients.map(client => ({
        phoneNumber: client.phone,
        params: [
          { name: '客户姓名', value: client.name },
          { name: '客户等级', value: client.level },
          { name: '产品类型', value: client.productType },
          { name: '到期时间', value: client.expiryDate }
        ]
      })),
      autoFlowId: 67890,
      countryCode: '86'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    });

    console.log('金融平台追加号码结果:', response.data);
    return response.data;
  } catch (error) {
    console.error('金融平台调用失败:', error.response?.data || error.message);
    throw error;
  }
}

// 使用示例
const clients = [
  {
    phone: '13900000001',
    name: '王五',
    level: 'VIP',
    productType: '理财产品',
    expiryDate: '2024-12-31'
  },
  {
    phone: '13900000002',
    name: '赵六',
    level: '普通',
    productType: '保险产品',
    expiryDate: '2025-06-30'
  }
];

appendClientNumbers('finance-task-001', clients);
```

### 3. 状态检查示例

```javascript
// 检查API Key状态
async function checkApiKeyStatus(apiKey) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/openapi/status`, {
      headers: {
        'x-api-key': apiKey
      }
    });

    if (response.data.code === 200) {
      const data = response.data.data;
      console.log('API Key状态:', {
        apiKey: data.apiKey,
        alias: data.apiKeyAlias,
        description: data.apiKeyDescription,
        hasConfig: data.hasOpenApiConfig,
        baseUrl: data.openApiBaseUrl,
        bizType: data.openApiBizType
      });
    }
  } catch (error) {
    console.error('状态检查失败:', error.response?.data || error.message);
  }
}

// 检查电商平台状态
checkApiKeyStatus('ecommerce-platform-key-abc123');

// 检查金融平台状态
checkApiKeyStatus('finance-platform-key-xyz789');
```

### 4. 获取所有可用API Keys

```javascript
// 获取所有可用的API Keys信息（不需要认证）
async function getAllApiKeys() {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/openapi/keys`);
    
    if (response.data.code === 200) {
      const data = response.data.data;
      console.log(`总共有 ${data.totalKeys} 个API Key:`);
      
      data.keys.forEach((key, index) => {
        console.log(`${index + 1}. ${key.alias}`);
        console.log(`   描述: ${key.description}`);
        console.log(`   配置状态: ${key.hasOpenApiConfig ? '已配置' : '未配置'}`);
        console.log(`   服务地址: ${key.openApiBaseUrl}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('获取API Keys失败:', error.message);
  }
}

getAllApiKeys();
```

## 错误处理

### 1. API Key无效

```json
{
  "code": 403,
  "message": "Invalid API Key: invalid-key",
  "error": "INVALID_API_KEY",
  "availableKeys": [
    {
      "alias": "电商平台A",
      "description": "电商公司的营销外呼系统"
    },
    {
      "alias": "金融平台B", 
      "description": "金融公司的客户服务系统"
    }
  ]
}
```

### 2. OpenAPI配置不完整

```json
{
  "code": 500,
  "message": "OpenAPI configuration is incomplete for API Key: 电商平台A",
  "error": "OPENAPI_CONFIG_INCOMPLETE",
  "apiKeyAlias": "电商平台A"
}
```

### 3. 参数验证失败

```json
{
  "code": 400,
  "message": "phoneNumbers must be a non-empty array",
  "error": "INVALID_PHONE_NUMBERS"
}
```

## 最佳实践

### 1. 安全性
- 使用HTTPS传输
- 定期更换API Key
- 不要在客户端代码中硬编码API Key
- 使用环境变量管理敏感信息

### 2. 错误处理
- 实现重试机制
- 记录详细的错误日志
- 提供友好的错误提示

### 3. 性能优化
- 批量处理号码追加
- 使用连接池
- 实现请求缓存

### 4. 监控和日志
- 监控API调用频率
- 记录成功/失败统计
- 设置告警机制

## 测试工具

使用项目提供的测试脚本：

```bash
# 运行多租户测试
node test-multi-tenant.js
```

测试脚本会验证：
- API Key认证
- 租户配置隔离
- 号码追加功能
- 状态查询功能

## 技术支持

如有问题，请联系技术支持团队或查看：
- [OpenAPI外部接口文档](./openapi-external-api.md)
- [配置安全说明](./openapi-config-security.md)
- [项目配置指南](../config/README.md)
