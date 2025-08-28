# 表单Webhook集成指南

## 功能概述

表单Webhook功能允许外部表单系统（如金数据）在用户提交表单后，自动将数据推送给我们的系统。系统会自动处理数据，提取电话号码和其他信息，然后调用追加号码接口将用户加入指定的营销任务。

## 🎯 核心功能

- ✅ **自动数据接收**: 接收外部表单推送的数据
- ✅ **智能字段映射**: 自动提取电话号码和用户信息
- ✅ **配置化管理**: 支持多表单、多任务的灵活配置
- ✅ **自动追加号码**: 无缝集成现有的追加号码功能
- ✅ **详细日志记录**: 完整的处理过程日志
- ✅ **错误处理**: 完善的错误处理和状态反馈

## 📋 快速开始

### 1. 配置表单映射

编辑 `config/form-mapping.config.ts` 文件：

```typescript
export const DEFAULT_FORM_MAPPINGS: FormMapping[] = [
  {
    formId: 'E0Tqhk',  // 你的表单ID
    taskId: '23ac8c5d-4e43-4669-bff8-1ab1f8436933', // 对应的任务ID
    formName: '华为全连接大会 | NXAI AI互动体验信息登记',
    description: '华为全连接大会表单数据推送',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
```

### 2. 启动服务

```bash
# 启动开发环境
npm run dev:all

# 或分别启动
npm run start:backend  # 启动后端服务 (端口8400)
npm run start          # 启动前端服务 (端口3010)
```

### 3. 配置外部表单

在你的表单系统中（如金数据）配置Webhook：

```
Webhook URL: http://your-server:8400/api/webhook/form-submission
Method: POST
Content-Type: application/json
```

## 🔧 配置说明

### 支持的表单类型

目前支持以下表单：

1. **中文表单** (`E0Tqhk`)
   - 表单名称：华为全连接大会 | NXAI AI互动体验信息登记
   - 适用地区：中文用户

2. **英文表单** (`wE4D2a`)
   - 表单名称：HUAWEI CONNECT 2025 | NXAI AI Interactive Experience Sign-up
   - 适用地区：英文用户

### 字段映射规则

| 表单字段 | 映射到 | 说明 |
|---------|--------|------|
| `field_5` | 电话号码 | 必填，11位中国手机号 |
| `field_2` | 用户姓名 | 可选，作为参数存储 |
| 其他字段 | 扩展参数 | 自动作为参数存储 |

### 支持的数据格式

```json
{
  "form": "E0Tqhk",
  "form_name": "表单名称",
  "entry": {
    "field_5": "13812345678",  // 电话号码
    "field_2": "张三",          // 姓名
    "field_3": "其他信息",
    "creator_name": "提交者",
    "created_at": "2025-08-26T09:55:12.740Z",
    "info_region": {
      "province": "省份",
      "city": "城市"
    }
  }
}
```

## 🧪 测试接口

### 使用测试脚本

```bash
# 运行完整测试（测试所有表单）
node test-form-webhook.js

# 测试特定表单
node test-form-webhook.js E0Tqhk   # 测试中文表单
node test-form-webhook.js wE4D2a   # 测试英文表单

# 测试配置接口
node test-form-mapping.js
```

### 手动测试

```bash
# 1. 查看当前配置
curl http://localhost:8400/api/webhook/form-mapping

# 2. 发送测试数据
curl -X POST http://localhost:8400/api/webhook/form-submission \
  -H "Content-Type: application/json" \
  -d '{
    "form": "E0Tqhk",
    "form_name": "测试表单",
    "entry": {
      "field_5": "13812345678",
      "field_2": "测试用户",
      "creator_name": "测试者"
    }
  }'

# 3. 添加新表单映射
curl -X POST http://localhost:8400/api/webhook/update-mapping \
  -H "Content-Type: application/json" \
  -d '{
    "formId": "NEW_FORM_ID",
    "taskId": "NEW_TASK_ID",
    "formName": "新表单名称"
  }'
```

## 📊 监控和日志

### 日志输出示例

```
[2025-08-26 18:22:35] 📝 收到表单数据推送: formId=E0Tqhk, serialNumber=123
[2025-08-26 18:22:35] 🔄 处理表单数据: phoneNumber=13812345678, paramsCount=6
[2025-08-26 18:22:35] ✅ 表单数据处理完成: success=true, total=1, successCount=1
```

### 常见问题排查

1. **表单未配置错误**
   ```
   错误: No taskID mapping found for form: XXX
   解决: 在 config/form-mapping.config.ts 中添加表单映射
   ```

2. **电话号码格式错误**
   ```
   错误: Invalid phone number in field_5
   解决: 确保 field_5 是有效的11位中国手机号
   ```

3. **追加号码失败**
   ```
   错误: OpenAPI调用失败
   解决: 检查 taskID 是否有效，以及OpenAPI配置是否正确
   ```

## 🔒 安全考虑

- 接口不要求认证（因为是外部系统推送）
- 建议在生产环境中添加IP白名单限制
- 所有请求都会记录详细日志用于审计

## 🚀 生产部署

### 环境变量配置

```bash
# 生产环境端口
PORT=8400

# 日志级别
LOG_LEVEL=info

# CORS配置
CORS_ORIGIN=https://your-domain.com
```

### Nginx反向代理配置

```nginx
location /api/webhook {
    proxy_pass http://localhost:8400;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## 📚 API文档

详细的API文档请查看：
- [`docs/form-webhook-api.md`](docs/form-webhook-api.md) - 完整的API接口文档
- [`docs/append-numbers-api-examples.md`](docs/append-numbers-api-examples.md) - 追加号码接口示例

## 🆘 技术支持

如果遇到问题，请：

1. 检查后端服务日志
2. 验证表单映射配置
3. 确认taskID的有效性
4. 查看网络连接和防火墙设置

## 🎉 成功案例

✅ **华为全连接大会表单集成**
- 表单ID: `E0Tqhk`
- 每日处理: 100+ 表单提交
- 自动追加到营销任务
- 完整的数据字段映射

---

**最后更新**: 2025-08-28
**版本**: 1.0.0
