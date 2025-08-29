# API Key 安全管理功能

## 功能概述

本系统为API Key管理添加了安全保护功能，包括脱敏显示和超级管理员密码验证。

## 功能特性

### 🔒 脱敏显示
- **规则**: API Key超过8位时显示前8位 + `***`
- **示例**:
  - `short` → `short` (8位及以下显示完整)
  - `abcdefgh` → `abcdefgh` (8位显示完整)
  - `abcdefghi` → `abcdefgh***` (超过8位脱敏)
  - `demo-api-key-1` → `demo-api***` (脱敏显示)

### 🔑 超级管理员密码验证
- **默认密码**: `F511522591`
- **环境变量**: 可通过 `ADMIN_PASSWORD` 环境变量覆盖
- **用途**: 查看完整的API Key敏感信息

## 使用方法

### 1. 查看脱敏的API Key
在API Key管理页面中，API Key列会自动显示脱敏后的内容。

### 2. 查看完整API Key信息
1. 点击API Key旁边的 🔓 解锁图标
2. 在弹出的密码验证框中输入超级管理员密码
3. 验证成功后会显示完整的API Key信息，包括：
   - 完整的API Key
   - Access Key
   - Access Secret
   - 其他配置信息

### 3. 配置超级管理员密码

#### 方法1: 环境变量（推荐）
```bash
export ADMIN_PASSWORD=your_custom_password
```

#### 方法2: 直接修改配置文件
编辑 `config/project.config.ts` 中的 `adminPassword` 字段：
```typescript
adminPassword: 'your_custom_password'
```

## API 接口

### 验证超级管理员密码
```http
POST /internal-api/keys/verify-admin-password
Content-Type: application/json

{
  "password": "F511522591"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "密码验证成功",
  "data": {
    "isValid": true,
    "timestamp": "2025-08-29T01:20:42.427Z"
  }
}
```

### 获取完整API Key信息
```http
POST /internal-api/keys/full-detail/{apiKey}
Content-Type: application/json

{
  "password": "F511522591"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "获取完整信息成功",
  "data": {
    "apiKey": "demo-api-key-1",
    "alias": "营销云内部环境",
    "description": "开发环境API Key 1",
    "openapi": {
      "accessKey": "AK-764887602601150724-2786",
      "accessSecret": "0de4a159402a4e3494f76669ac92d6e6",
      "bizType": "8",
      "baseUrl": "https://api-westus.nxlink.ai"
    },
    "verifiedAt": "2025-08-29T01:20:56.884Z"
  }
}
```

## 安全说明

1. **前端不显示敏感信息**: Access Key和Access Secret默认不在前端显示
2. **密码保护**: 只有通过超级管理员密码验证才能查看完整信息
3. **审计日志**: 所有密码验证和完整信息查看操作都会记录日志
4. **环境隔离**: 不同环境可以配置不同的超级管理员密码

## 注意事项

- 超级管理员密码建议定期更换
- 生产环境请务必通过环境变量设置自定义密码
- 密码验证失败时会返回403错误，不会泄露密码信息
- 所有操作都会记录在后端日志中，便于审计

## 测试验证

运行以下命令可以测试功能：

```bash
# 测试密码验证
curl -X POST 'http://localhost:8400/internal-api/keys/verify-admin-password' \
  -H 'Content-Type: application/json' \
  -d '{"password":"F511522591"}'

# 测试获取完整信息
curl -X POST 'http://localhost:8400/internal-api/keys/full-detail/demo-api-key-1' \
  -H 'Content-Type: application/json' \
  -d '{"password":"F511522591"}'
```
