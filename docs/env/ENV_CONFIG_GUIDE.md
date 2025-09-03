# 🔧 环境配置指南

## 📋 问题解决

### 修复内容
已修复 `npm run start:prod` 不加载 `production.env` 配置文件的问题。

### 修复详情
1. **start.js 增强**：添加了环境变量配置文件自动加载功能
2. **后端优化**：根据 NODE_ENV 自动加载对应的环境配置文件
3. **多格式支持**：支持 `.env.production`、`production.env`、`.env` 等多种配置文件

## 🚀 使用方法

### 1. 创建生产环境配置
```bash
# 复制模板文件
cp .env.production.template .env.production

# 编辑配置文件
vim .env.production
```

### 2. 必须修改的配置项
```bash
# 安全配置（必须修改）
JWT_SECRET=your-production-jwt-secret-key-here-32-chars-minimum
ADMIN_PASSWORD=your-secure-admin-password

# 网络配置（根据实际域名修改）
CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com
```

### 3. 启动生产环境
```bash
# 方法1：使用npm脚本（推荐）
npm run start:prod

# 方法2：直接使用启动脚本
node start.js prod

# 方法3：使用PM2
pm2 start ecosystem.config.js
```

## 📊 配置文件优先级

启动脚本会按以下顺序查找配置文件：

### 生产环境 (prod)
1. `.env.production` （推荐）
2. `production.env` （兼容旧版本）
3. `.env` （默认）

### 开发环境 (dev)
1. `.env.development`
2. `.env`

### 测试环境 (test)
1. `.env.test`
2. `.env`

## 🔍 验证配置加载

### 1. 查看启动日志
启动时会显示配置加载信息：
```
🔧 加载环境配置: .env.production
✅ 已加载 13 个环境变量
```

### 2. 运行测试脚本
```bash
# 测试环境变量加载
./test-env-loading.sh

# 测试生产环境启动
./test-production-start.sh
```

## 📝 配置文件示例

### .env.production
```bash
NODE_ENV=production
PORT=8450
BACKEND_PORT=8450
GATEWAY_PORT=8350
CORS_ORIGIN=https://your-domain.com
JWT_SECRET=your-32-char-jwt-secret-key-here
ADMIN_PASSWORD=YourSecurePassword123!
LOG_LEVEL=warn
OPENAPI_ACCESS_KEY=your-openapi-key
OPENAPI_ACCESS_SECRET=your-openapi-secret
```

## 🔒 安全注意事项

### 1. 配置文件安全
- ✅ `.env.production` 已在 `.gitignore` 中，不会被提交
- ✅ 使用强密码和随机密钥
- ✅ 定期更新敏感配置

### 2. 权限设置
```bash
# 设置配置文件权限
chmod 600 .env.production

# 确保只有所有者可读写
ls -la .env.production
# 应显示: -rw------- 1 user user ... .env.production
```

## 🐛 故障排除

### 问题1：配置未生效
**症状**：启动后仍使用默认配置

**解决方案**：
1. 检查配置文件是否存在：`ls -la .env.production`
2. 检查配置文件格式：确保每行格式为 `KEY=VALUE`
3. 查看启动日志：确认是否显示"加载环境配置"

### 问题2：JWT_SECRET 未设置
**症状**：启动时提示JWT密钥错误

**解决方案**：
```bash
# 生成随机JWT密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 添加到配置文件
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env.production
```

### 问题3：端口冲突
**症状**：启动时提示端口被占用

**解决方案**：
```bash
# 检查端口占用
lsof -i :8450
lsof -i :8350

# 修改配置文件中的端口
PORT=8451
BACKEND_PORT=8451
GATEWAY_PORT=8351
```

## 📚 相关文档

- [部署指南](./DEPLOYMENT_GUIDE.md)
- [Docker部署](./DOCKER_FIX_GUIDE.md)
- [配置检查脚本](./check-deployment.sh)

## 🎯 快速检查清单

- [ ] 复制了 `.env.production.template` 为 `.env.production`
- [ ] 修改了 `JWT_SECRET`（不是默认值）
- [ ] 设置了 `ADMIN_PASSWORD`（强密码）
- [ ] 配置了正确的 `CORS_ORIGIN`
- [ ] 设置了文件权限 `chmod 600 .env.production`
- [ ] 运行 `npm run start:prod` 能看到配置加载日志
- [ ] 服务启动成功，端口正确

---

**✅ 现在 `npm run start:prod` 可以正确加载 `production.env` 配置文件了！**