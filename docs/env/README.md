# 🔧 环境配置文档

本目录包含项目的所有环境配置相关文档和模板文件。

## 📁 目录内容

```
docs/env/
├── .env.production.example      # 生产环境配置示例
├── .env.production.template     # 生产环境配置模板
├── env.production.template      # 环境变量模板
├── ENV_CONFIG_GUIDE.md          # 环境配置详细指南
└── README.md                    # 本说明文档
```

## 📋 文件说明

### 配置模板文件

#### `.env.production.template` ⭐⭐⭐⭐⭐
生产环境环境变量模板文件，包含所有必需的环境变量定义。

**用途**: 用于初始化生产环境配置
**重要性**: ⭐⭐⭐⭐⭐ (核心配置)

#### `env.production.template` ⭐⭐⭐⭐⭐
环境变量模板的另一个版本，保持兼容性。

**用途**: 作为环境配置的参考模板
**重要性**: ⭐⭐⭐⭐⭐ (核心配置)

#### `.env.production.example` ⭐⭐⭐
生产环境配置示例文件，展示配置格式和选项。

**用途**: 为开发者提供配置示例
**重要性**: ⭐⭐⭐ (参考配置)

### 文档文件

#### `ENV_CONFIG_GUIDE.md` ⭐⭐⭐⭐
环境配置详细使用指南，包含：
- 环境变量说明
- 配置步骤
- 常见问题解决

**用途**: 指导开发者正确配置环境
**重要性**: ⭐⭐⭐⭐ (重要文档)

## 🚀 使用指南

### 1. 初始化环境配置
```bash
# 从模板创建环境配置文件
cp docs/env/.env.production.template .env.production

# 或使用示例文件
cp docs/env/.env.production.example .env.production
```

### 2. 配置环境变量
```bash
# 编辑环境配置文件
nano .env.production

# 设置必要的环境变量
NODE_ENV=production
PORT=8400
API_KEY=your-api-key
# ... 其他变量
```

### 3. 验证配置
```bash
# 检查环境变量
node -e "console.log(process.env.NODE_ENV)"

# 启动服务验证配置
npm start
```

## 🔒 安全注意事项

1. **敏感信息**: 不要在配置文件中存储密码、密钥等敏感信息
2. **文件权限**: 设置适当的文件权限 (`chmod 600 .env.production`)
3. **版本控制**: 确保 `.env*` 文件在 `.gitignore` 中
4. **备份安全**: 定期备份环境配置（排除敏感信息）

## 📝 环境变量分类

### 基础配置
- `NODE_ENV`: 运行环境
- `PORT`: 服务端口
- `HOST`: 服务主机

### API配置
- `API_KEY`: API访问密钥
- `API_SECRET`: API密钥
- `API_BASE_URL`: API基础地址

### 数据库配置
- `DB_HOST`: 数据库主机
- `DB_PORT`: 数据库端口
- `DB_NAME`: 数据库名
- `DB_USER`: 数据库用户
- `DB_PASSWORD`: 数据库密码

### 第三方服务
- `REDIS_URL`: Redis连接地址
- `SMTP_HOST`: 邮件服务器
- `LOG_LEVEL`: 日志级别

## 🔧 配置验证

### 自动验证
```bash
# 使用内置验证脚本
node scripts/validate-env.js
```

### 手动验证
```bash
# 检查必需变量
echo $NODE_ENV
echo $API_KEY

# 测试数据库连接
# 测试API连接
```

## 🆘 故障排除

### 常见问题

1. **环境变量未生效**
   ```bash
   # 检查变量是否正确设置
   env | grep NODE_ENV

   # 重启应用
   npm restart
   ```

2. **配置文件权限问题**
   ```bash
   # 修复文件权限
   chmod 644 docs/env/*.template
   chmod 600 .env.production
   ```

3. **配置格式错误**
   ```bash
   # 验证配置文件格式
   node -c .env.production
   ```

## 📚 相关文档

- [项目配置](../config/README.md)
- [部署指南](../deployment/DEPLOYMENT_GUIDE.md)
- [Docker部署](../docker/DOCKER_DEPLOY_README.md)
- [测试脚本](../../tests/README.md)

## 🔄 更新流程

1. **修改模板**: 更新 `docs/env/*.template` 文件
2. **更新文档**: 同步更新 `ENV_CONFIG_GUIDE.md`
3. **验证配置**: 使用测试脚本验证配置
4. **部署更新**: 更新生产环境配置

---

**最后更新**: 2025年1月
**维护者**: 开发团队
