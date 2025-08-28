# API Key 动态管理功能说明

## 功能概述

API Key 动态管理功能允许你在运行时动态添加、编辑、删除API Key配置，而无需重启服务或修改环境变量。配置数据存储在JSON文件中，支持持久化保存。

## 核心特性

### 🚀 主要功能
- **动态添加**: 在运行时添加新的API Key配置
- **实时编辑**: 修改现有API Key的配置信息
- **安全删除**: 删除不再需要的API Key配置
- **状态测试**: 验证API Key的配置完整性
- **统计监控**: 查看配置统计和使用情况

### 💾 数据存储
- **配置文件**: 存储在 `config/api-keys.json`
- **双重来源**: 支持环境变量和配置文件两种配置方式
- **自动合并**: 环境变量配置和文件配置自动合并
- **持久化**: 配置修改实时保存到文件

### 🔒 安全特性
- **敏感信息保护**: accessKey/accessSecret不在前端显示真实值
- **权限隔离**: 每个API Key拥有独立的OpenAPI配置
- **验证机制**: 添加时自动验证配置完整性
- **重复检测**: 防止添加重复的API Key

## 使用方式

### 1. 前端界面操作

#### 访问管理页面
1. 打开应用
2. 导航到 "OpenAPI平台" → "API Key管理"
3. 查看当前所有API Key配置

#### 添加新API Key
1. 点击 "添加API Key" 按钮
2. 填写表单信息：
   - **API Key**: 唯一标识符（至少8位）
   - **别名**: 友好的显示名称
   - **描述**: 详细说明信息
   - **OpenAPI配置**:
     - Access Key: nxlink OpenAPI的访问密钥
     - Access Secret: nxlink OpenAPI的访问密钥
     - 业务类型: 通常为8
     - 服务地址: 默认为 https://api-westus.nxlink.ai
3. 点击 "添加" 保存配置

#### 编辑现有API Key
1. 在列表中找到要编辑的API Key
2. 点击 "编辑" 按钮
3. 修改配置信息
4. 点击 "更新" 保存修改

#### 删除API Key
1. 在列表中找到要删除的API Key
2. 点击 "删除" 按钮
3. 确认删除操作

#### 测试API Key
1. 在列表中找到要测试的API Key
2. 点击 "测试" 按钮
3. 查看测试结果弹窗

### 2. API接口调用

#### 获取所有API Keys
```bash
GET /api/keys/list
```

#### 添加API Key
```bash
POST /api/keys/add
Content-Type: application/json

{
  "apiKey": "my-platform-key-123",
  "alias": "我的平台",
  "description": "平台描述",
  "openapi": {
    "accessKey": "AK-xxxxx",
    "accessSecret": "secret-xxxxx",
    "bizType": "8",
    "baseUrl": "https://api-westus.nxlink.ai"
  }
}
```

#### 更新API Key
```bash
PUT /api/keys/update/{apiKey}
Content-Type: application/json

{
  "alias": "新的别名",
  "description": "新的描述"
}
```

#### 删除API Key
```bash
DELETE /api/keys/delete/{apiKey}
```

#### 测试API Key
```bash
POST /api/keys/test
Content-Type: application/json

{
  "apiKey": "my-platform-key-123"
}
```

### 3. 命令行测试

使用提供的测试脚本：
```bash
node test-api-key-management.js
```

测试脚本会自动执行完整的CRUD操作测试。

## 配置文件结构

### api-keys.json 文件格式
```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-01-27T10:30:00.000Z",
  "keys": [
    {
      "apiKey": "platform-a-key-123",
      "alias": "客户平台A",
      "description": "A公司的外呼系统",
      "openapi": {
        "accessKey": "AK-764887602601150724-2786",
        "accessSecret": "0de4a159402a4e3494f76669ac92d6e6",
        "bizType": "8",
        "baseUrl": "https://api-westus.nxlink.ai"
      }
    }
  ]
}
```

### 配置优先级
1. **运行时添加**: 通过管理界面添加的配置（最高优先级）
2. **环境变量**: 通过EXTERNAL_API_KEY_*环境变量配置
3. **默认配置**: 项目配置文件中的默认值

### 配置合并规则
- 环境变量和文件配置自动合并
- 相同apiKey的配置，环境变量优先
- 删除操作只影响文件配置，不影响环境变量配置

## 最佳实践

### 1. 配置管理
- **命名规范**: 使用有意义的API Key名称，如 `company-platform-prod`
- **别名设置**: 使用中文别名，便于识别，如 "某某公司生产环境"
- **描述详细**: 填写详细的描述信息，包括用途和联系人
- **定期检查**: 定期测试API Key的有效性

### 2. 安全建议
- **密钥保护**: 不要在日志或公开场所暴露真实的accessKey/accessSecret
- **权限最小化**: 每个API Key只配置必要的OpenAPI权限
- **定期轮换**: 定期更换API Key和OpenAPI密钥
- **监控使用**: 监控API Key的使用情况，及时发现异常

### 3. 开发流程
- **测试环境**: 先在测试环境验证API Key配置
- **渐进部署**: 分批添加API Key，避免影响现有服务
- **备份配置**: 定期备份 `config/api-keys.json` 文件
- **版本控制**: 将配置文件变更纳入版本控制（注意敏感信息）

## 故障排除

### 常见问题

#### 1. 添加API Key失败
- **重复API Key**: 检查是否已存在相同的API Key
- **配置验证**: 确保所有必填字段都已填写
- **网络连接**: 检查服务器网络连接状态

#### 2. 测试API Key失败
- **配置不完整**: 检查OpenAPI配置是否完整
- **密钥错误**: 验证accessKey和accessSecret是否正确
- **服务地址**: 确认baseUrl是否可访问

#### 3. 配置文件问题
- **权限问题**: 检查config目录的读写权限
- **格式错误**: 验证JSON文件格式是否正确
- **备份恢复**: 从备份恢复配置文件

### 日志调试

服务器日志中会显示相关操作信息：
```
✅ API Key已添加: 客户平台A (platform-a-key-123)
🔑 API Key认证成功: 客户平台A (platform-a-key-123)
✅ 配置文件已更新: /path/to/config/api-keys.json
```

### 配置验证

使用测试脚本验证配置：
```bash
# 验证所有API Key
node test-api-key-management.js

# 验证多租户功能
node test-multi-tenant.js
```

## 技术实现

### 架构说明
- **前端**: React + Ant Design 实现管理界面
- **后端**: Express.js + 配置文件管理器
- **存储**: JSON文件存储，支持实时读写
- **认证**: API Key认证中间件自动加载最新配置

### 文件结构
```
config/
├── api-keys.json          # 动态API Key配置文件
├── project.config.ts      # 项目配置文件
└── env.template          # 环境变量模板

server/src/
├── services/
│   └── configManager.ts  # 配置文件管理器
├── routes/
│   └── apiKeyManagement.ts # API Key管理路由
└── middleware/
    └── apiKeyAuth.ts     # 更新的认证中间件

src/pages/
└── ApiKeyManagementPage.tsx # 前端管理页面
```

### API响应格式
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    // 具体数据
  }
}
```

这个动态管理功能让API Key的管理变得更加灵活和方便，支持运行时配置修改，大大提升了系统的可维护性。
