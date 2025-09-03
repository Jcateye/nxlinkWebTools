# 测试脚本说明

本目录包含项目的各种测试脚本，按照功能分类组织。

## 📁 目录结构

```
tests/
├── api/                    # API功能测试
│   ├── test-simple-mapping.js     # 简化字段映射测试
│   ├── test-new-webhook.js        # 新Webhook接口测试
│   ├── test-template-config.js    # 模板配置测试
│   ├── test-api-key-deletion.js   # API Key删除测试
│   ├── test-api-key-desensitization.js # API Key脱敏测试
│   ├── test-api-key-management.js # API Key管理测试
│   ├── test-form-mapping.js       # 表单映射测试
│   ├── test-form-webhook.js       # 表单Webhook测试
│   └── test-multi-tenant.js       # 多租户测试
├── config/                # 配置相关测试（暂无）
├── docker/                # Docker部署测试
│   ├── test-docker-build.sh       # Docker构建测试
│   ├── test-docker-deploy.sh      # Docker部署测试
│   └── test-docker-quick.sh       # Docker快速测试
└── integration/           # 集成测试
    ├── test-env-loading.sh        # 环境加载测试
    └── test-production-start.sh   # 生产环境启动测试
```

## 🚀 快速开始

### 运行所有API测试
```bash
# 测试简化字段映射
node tests/api/test-simple-mapping.js

# 测试新的Webhook接口
node tests/api/test-new-webhook.js

# 测试模板配置
node tests/api/test-template-config.js
```

### 运行Docker测试
```bash
# Docker构建测试
bash tests/docker/test-docker-build.sh

# Docker部署测试
bash tests/docker/test-docker-deploy.sh
```

## 📋 测试脚本说明

### API测试

#### `test-simple-mapping.js`
测试简化的字段映射功能：
- `phone` → `phoneNumber` (直接映射)
- `name` → `name` (直接映射)
- 其他字段 → `params["字段key"]` (直接使用字段key)

#### `test-new-webhook.js`
测试新的Webhook接口功能：
- URL参数传递taskId和templateId
- 模板系统验证
- 数据处理逻辑

#### `test-template-config.js`
测试模板配置系统：
- 模板加载和验证
- 字段映射配置
- 模板参数处理

#### `test-api-key-*.js`
API Key相关功能测试：
- 删除、脱敏、管理等功能验证

#### `test-form-*.js`
表单相关功能测试：
- 表单映射、Webhook处理等

#### `test-multi-tenant.js`
多租户功能测试

### Docker测试

#### `test-docker-build.sh`
测试Docker镜像构建过程

#### `test-docker-deploy.sh`
测试Docker容器部署

#### `test-docker-quick.sh`
快速Docker测试脚本

### 集成测试

#### `test-env-loading.sh`
测试环境变量加载

#### `test-production-start.sh`
测试生产环境启动

## 🔧 配置说明

### 测试环境设置

在运行测试前，请确保：

1. **启动服务**
   ```bash
   npm run dev  # 开发环境
   # 或
   npm start    # 生产环境
   ```

2. **配置测试参数**
   修改测试脚本中的配置：
   ```javascript
   const TEST_CONFIG = {
     baseUrl: 'http://localhost:8400',  // 服务地址
     taskId: 'your-task-id',            // 实际的任务ID
     apiKey: 'your-api-key'             // 实际的API Key
   };
   ```

3. **准备测试数据**
   根据测试脚本的要求准备相应的测试数据

## 📊 测试结果说明

### 成功标识
- ✅ 测试通过
- 📊 显示相关统计信息
- 🎯 验证功能正确性

### 失败标识
- ❌ 测试失败
- 💥 显示错误信息
- 🔍 提供调试信息

## 🛠️ 自定义测试

### 添加新的API测试
1. 在 `tests/api/` 目录创建新的测试脚本
2. 遵循现有的命名规范：`test-功能名称.js`
3. 参考现有测试脚本的结构

### 添加新的Docker测试
1. 在 `tests/docker/` 目录创建新的测试脚本
2. 使用 `.sh` 扩展名
3. 遵循现有的命名规范

## 📝 注意事项

1. **环境要求**：确保测试环境与生产环境一致
2. **数据安全**：测试数据不要包含敏感信息
3. **清理工作**：测试完成后清理测试数据
4. **文档更新**：添加新测试时更新此文档

## 🔗 相关文档

- [API使用指南](../docs/new-webhook-api-guide.md)
- [部署指南](../DEPLOYMENT_GUIDE.md)
- [Docker部署](../DOCKER_DEPLOY_README.md)
