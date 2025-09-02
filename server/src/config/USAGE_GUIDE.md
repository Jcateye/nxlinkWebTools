# 配置使用指南

## 📋 配置类型说明

### 1. 默认配置 (DEFAULT_CONFIG)
**作用**：配置模板和兜底值
**使用场景**：不会直接使用，作为其他配置的基础

### 2. 开发环境配置 (DEVELOPMENT_CONFIG)
**作用**：本地开发时使用
**触发条件**：`NODE_ENV=development` 或 `NODE_ENV` 未设置

### 3. 生产环境配置 (PRODUCTION_CONFIG)
**作用**：正式部署时使用
**触发条件**：`NODE_ENV=production`

## 🚀 命令与配置对应关系

### 开发环境命令（使用 DEVELOPMENT_CONFIG）

#### 前端开发
```bash
# 启动前端开发服务器
npm run dev
# 等同于：NODE_ENV=development vite

# 构建前端（开发模式）
npm run build:dev
# 等同于：NODE_ENV=development vite build
```

#### 后端开发
```bash
# 启动后端开发服务器
npm start
# 等同于：node server.js

# 使用 nodemon 开发
npm run dev:server
# 等同于：nodemon server.js
```

#### 全栈开发
```bash
# 同时启动前后端
npm run dev:all
# 等同于：concurrently "npm run dev" "npm run dev:server"
```

### 生产环境命令（使用 PRODUCTION_CONFIG）

#### 前端生产构建
```bash
# 构建前端（生产模式）
NODE_ENV=production npm run build
# 等同于：NODE_ENV=production vite build
```

#### 后端生产运行
```bash
# 启动后端生产服务器
NODE_ENV=production npm start
# 等同于：NODE_ENV=production node server.js

# 使用 PM2 管理
NODE_ENV=production pm2 start server.js
```

#### Docker 部署
```dockerfile
# Dockerfile 中设置环境
ENV NODE_ENV=production
CMD ["npm", "start"]
```

## 🔧 环境变量优先级

### 配置读取顺序（从高到低）：

1. **环境变量** (最高优先级)
2. **环境特定配置** (DEVELOPMENT_CONFIG 或 PRODUCTION_CONFIG)
3. **默认配置** (DEFAULT_CONFIG，最低优先级)

### 示例：端口配置

```bash
# 场景1：没有设置任何环境变量
npm start
# 结果：使用开发环境默认端口 8001

# 场景2：设置了 PORT 环境变量
PORT=9000 npm start
# 结果：使用端口 9000

# 场景3：生产环境
NODE_ENV=production npm start
# 结果：使用生产环境端口 8001

# 场景4：生产环境 + 自定义端口
NODE_ENV=production PORT=9000 npm start
# 结果：使用端口 9000
```

## 📝 实际使用场景

### 场景1：本地开发（推荐）
```bash
# 1. 复制环境变量模板
cp config/env.template .env

# 2. 编辑 .env 文件，填入真实配置
# OPENAPI_ACCESS_KEY=your-real-key
# OPENAPI_ACCESS_SECRET=your-real-secret

# 3. 启动开发服务器（自动读取 .env）
npm run dev        # 前端
npm start          # 后端
```

### 场景2：测试环境
```bash
# 使用测试环境的配置
NODE_ENV=development \
OPENAPI_ACCESS_KEY=test-key \
OPENAPI_ACCESS_SECRET=test-secret \
npm start
```

### 场景3：生产环境部署
```bash
# 方式1：通过环境变量
NODE_ENV=production \
OPENAPI_ACCESS_KEY=prod-key \
OPENAPI_ACCESS_SECRET=prod-secret \
EXTERNAL_API_KEY_1=prod-api-key \
npm start

# 方式2：通过 .env.production 文件
NODE_ENV=production npm start
```

### 场景4：Docker 容器
```dockerfile
# Dockerfile
ENV NODE_ENV=production
ENV OPENAPI_ACCESS_KEY=your-prod-key
ENV OPENAPI_ACCESS_SECRET=your-prod-secret
CMD ["npm", "start"]
```

## 🔍 配置调试

### 查看当前使用的配置
```bash
# 启动服务器时会自动打印配置信息
npm start

# 输出示例：
# 🔧 项目配置信息:
# 📍 服务端口: 8001
# 🌐 环境: development
# 🔑 OpenAPI AccessKey: 已配置
# ✅ 配置验证通过
```

### 手动测试配置
```bash
# 运行配置测试
node -e "
const { PROJECT_CONFIG, validateConfig } = require('./config/project.config.ts');
console.log('当前配置:', PROJECT_CONFIG);
console.log('验证结果:', validateConfig(PROJECT_CONFIG));
"
```

## ⚠️ 常见问题

### 问题1：配置不生效
**原因**：环境变量设置错误或优先级问题
**解决**：
```bash
# 检查环境变量
echo $NODE_ENV
echo $OPENAPI_ACCESS_KEY

# 临时设置环境变量
export NODE_ENV=production
export OPENAPI_ACCESS_KEY=your-key
npm start
```

### 问题2：前端配置不生效
**原因**：前端环境变量必须以 `VITE_` 开头
**解决**：
```bash
# 错误：
OPENAPI_ACCESS_KEY=key npm run dev

# 正确：
VITE_OPENAPI_ACCESS_KEY=key npm run dev
```

### 问题3：生产环境配置验证失败
**原因**：生产环境必须设置真实的 API 密钥
**解决**：
```bash
# 确保设置了必要的环境变量
NODE_ENV=production \
OPENAPI_ACCESS_KEY=real-key \
OPENAPI_ACCESS_SECRET=real-secret \
JWT_SECRET=secure-jwt-secret \
npm start
```

## 📚 配置文件说明

| 文件 | 作用 | 何时使用 |
|------|------|----------|
| `project.config.ts` | 主配置文件 | 代码中导入使用 |
| `env.template` | 环境变量模板 | 复制为 `.env` 使用 |
| `README.md` | 配置文档 | 查看配置说明 |
| `USAGE_GUIDE.md` | 使用指南 | 查看命令说明 |
| `example.config.ts` | 使用示例 | 学习如何使用配置 |

## 🎯 最佳实践

1. **开发环境**：
   - 复制 `env.template` 为 `.env`
   - 填入真实的 API 密钥
   - 使用 `npm run dev` 启动

2. **生产环境**：
   - 通过环境变量设置敏感信息
   - 使用 `NODE_ENV=production`
   - 验证所有必要配置已设置

3. **安全性**：
   - 不要将 `.env` 文件提交到版本控制
   - 生产环境使用强密码
   - 定期更换 API 密钥

4. **调试**：
   - 查看启动时的配置信息
   - 使用配置验证功能
   - 检查环境变量设置
