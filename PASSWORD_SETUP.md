# 🔑 密码设置指南

## 📋 当前配置状态

✅ **配置文件已清理完成**
- 删除重复的环境配置文件
- 创建干净的 `.env.production` 文件
- 只保留必要的配置项

## 🔐 需要设置的密码

### 1. 超级管理员密码 (必须设置)
```bash
# 编辑 .env.production 文件
nano .env.production

# 找到这一行：
ADMIN_PASSWORD=your-secure-admin-password-change-this-immediately

# 替换为你的新密码，例如：
ADMIN_PASSWORD=MySecurePassword123!
```

### 2. JWT密钥 (必须设置)
```bash
# 在 .env.production 文件中找到：
JWT_SECRET=your-production-jwt-secret-key-here-32-chars-minimum-change-this-please

# 替换为安全的随机字符串，例如：
JWT_SECRET=super-secure-jwt-secret-key-32-characters-long-at-least-2025
```

### 3. OpenAPI密钥 (建议设置)
```bash
# 如果你有OpenAPI服务，需要设置：
OPENAPI_ACCESS_KEY=your-actual-openapi-access-key
OPENAPI_ACCESS_SECRET=your-actual-openapi-access-secret
```

## 🚀 启动服务

设置完密码后，启动服务：

```bash
# 启动生产环境
node start prod

# 或者启动开发环境
node start dev
```

## 🔑 默认密码

**当前配置中的默认密码**：
- `ADMIN_PASSWORD`: `your-secure-admin-password-change-this-immediately`
- `JWT_SECRET`: `your-production-jwt-secret-key-here-32-chars-minimum-change-this-please`

⚠️ **重要提醒**：
1. 必须修改默认密码！
2. 密码应该包含字母、数字和特殊字符
3. 密码长度至少12个字符
4. 不要使用容易猜到的密码

## 📝 密码安全建议

### 强密码要求
- ✅ 至少12个字符
- ✅ 包含大写字母、小写字母
- ✅ 包含数字
- ✅ 包含特殊字符 (!@#$%^&*)

### 密码示例
```
✅ 好的密码: MySecureP@ssw0rd2025!
❌ 坏的密码: password123, admin123, 123456
```

### 定期更换
建议每3个月更换一次密码，并避免重复使用之前的密码。

---

设置完成后，删除此文件以避免密码泄露：
```bash
rm PASSWORD_SETUP.md
```
