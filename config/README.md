# 配置文件说明

本目录包含项目的所有配置文件，按照功能分类组织。

## 📁 目录结构

```
config/
├── form-templates.config.ts     # 表单模板配置（核心）
├── project.config.ts            # 项目基础配置
├── example.config.ts            # 配置示例
├── env.template                 # 环境变量模板
├── production.env.example       # 生产环境配置示例
├── README.md                    # 本说明文档
└── USAGE_GUIDE.md              # 配置使用指南
```

## 📋 配置文件说明

### `form-templates.config.ts` ⭐ **核心配置**
表单模板配置文件，定义所有表单模板及其字段映射关系。

**重要性**: ⭐⭐⭐⭐⭐
- 定义表单模板和字段映射
- 控制数据转换规则
- 支持动态配置

**配置内容**:
- 5个内置模板：contact、registration、inquiry、feedback、demo
- 字段映射规则：phone→phoneNumber、name→name、其他字段→params
- 模板启用/禁用控制

### `project.config.ts` ⭐⭐⭐ **项目配置**
项目的基础配置文件，包含API配置、数据库配置等。

**重要性**: ⭐⭐⭐
- API接口配置
- 数据库连接配置
- 第三方服务配置

### `example.config.ts` ⭐⭐ **配置示例**
配置文件的示例模板，用于帮助开发者理解配置结构。

**重要性**: ⭐⭐
- 提供配置模板
- 展示配置选项
- 辅助开发调试

### `env.template` ⭐ **环境变量模板**
环境变量的模板文件，定义所需的全部环境变量。

**重要性**: ⭐
- 环境变量定义
- 配置标准化
- 部署参考

### `production.env.example` ⭐ **生产环境配置**
生产环境的配置示例文件。

**重要性**: ⭐
- 生产环境配置参考
- 安全配置示例
- 部署配置模板

## 🔧 配置使用指南

### 1. 表单模板配置

#### 添加新模板
```typescript
// 在 form-templates.config.ts 的 DEFAULT_FORM_TEMPLATES 数组中添加
{
  templateId: 'your_template',
  name: '您的模板名称',
  description: '模板描述',
  fieldMapping: {
    phone: 'phone_field',    // 电话号码字段名
    name: 'name_field',      // 姓名字段名
    email: 'email_field',    // 邮箱字段名
    // ... 其他字段
  },
  enabled: true,
  // ... 其他配置
}
```

#### 修改字段映射
```typescript
fieldMapping: {
  phone: 'mobile_phone',    // 修改电话号码字段名
  name: 'full_name',        // 修改姓名字段名
  email: 'email_address',   // 修改邮箱字段名
  // ... 其他字段保持不变
}
```

### 2. 项目配置

#### 修改API配置
```typescript
// 在 project.config.ts 中修改
export const PROJECT_CONFIG = {
  openapi: {
    baseUrl: 'https://your-api-domain.com',
    accessKey: 'your-access-key',
    accessSecret: 'your-access-secret',
    bizType: 'your-biz-type'
  }
  // ... 其他配置
}
```

### 3. 环境变量配置

#### 复制环境变量模板
```bash
cp config/env.template .env
```

#### 编辑环境变量
```bash
# 编辑 .env 文件
NODE_ENV=production
PORT=8400
API_KEY=your-api-key
# ... 其他变量
```

## 📝 配置加载顺序

1. **环境变量** (`.env` 文件)
2. **项目配置** (`project.config.ts`)
3. **表单模板配置** (`form-templates.config.ts`)

## 🔒 安全注意事项

1. **敏感信息**: 不要在配置文件中存储密码、密钥等敏感信息
2. **环境变量**: 使用环境变量存储敏感配置
3. **Git忽略**: 确保 `.env` 文件在 `.gitignore` 中
4. **权限控制**: 配置文件应有适当的文件权限

## 🚀 配置验证

### 验证表单模板配置
```bash
# 重启服务验证配置
npm run dev

# 检查日志输出，确认模板加载成功
# 查看控制台日志中的模板信息
```

### 验证项目配置
```bash
# 测试API连接
curl -X GET "http://localhost:8400/api/health"

# 验证数据库连接
# 检查应用启动日志
```

## 🛠️ 故障排除

### 模板配置问题
- 检查 `form-templates.config.ts` 语法是否正确
- 确认模板ID不重复
- 验证字段映射配置

### 项目配置问题
- 检查 `project.config.ts` 中的API配置
- 验证环境变量设置
- 查看应用启动日志

### 环境变量问题
- 确认 `.env` 文件存在
- 检查变量名称拼写
- 验证变量值格式

## 📚 相关文档

- [API使用指南](../docs/new-webhook-api-guide.md)
- [环境配置指南](../ENV_CONFIG_GUIDE.md)
- [部署指南](../DEPLOYMENT_GUIDE.md)
- [测试脚本说明](../tests/README.md)

## 🔄 配置更新流程

1. **修改配置**: 编辑相应的配置文件
2. **语法检查**: 确保TypeScript语法正确
3. **重启服务**: 重新启动应用以加载新配置
4. **功能测试**: 使用测试脚本验证功能
5. **部署更新**: 更新生产环境配置

---

**最后更新**: 2025年1月
**维护者**: 开发团队