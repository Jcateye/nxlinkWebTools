# LLM测试系统后端服务

这是一个基于Node.js + TypeScript + MySQL + Prisma的LLM测试系统后端服务。

## 🚀 技术栈

- **后端框架**: Express.js + TypeScript
- **数据库**: MySQL + Prisma ORM
- **实时通信**: Socket.io
- **日志系统**: Winston
- **API文档**: Swagger
- **认证**: JWT
- **限流**: 自定义中间件

## 📁 项目结构

```
server/
├── src/
│   ├── index.ts              # 主入口文件
│   ├── middleware/           # 中间件
│   │   ├── errorHandler.ts   # 错误处理
│   │   └── rateLimiter.ts    # 限流中间件
│   ├── routes/              # API路由
│   │   ├── auth.ts          # 认证相关
│   │   ├── providers.ts     # LLM厂商管理
│   │   ├── prompts.ts       # 提示词管理
│   │   ├── tests.ts         # 测试运行
│   │   └── analytics.ts     # 数据分析
│   ├── utils/               # 工具函数
│   │   ├── logger.ts        # 日志工具
│   │   ├── database.ts      # 数据库连接
│   │   └── swagger.ts       # API文档
│   └── sockets/             # Socket.io处理
│       └── testSocket.ts    # 测试实时通信
├── prisma/
│   └── schema.prisma        # 数据库模式
├── package.json
├── tsconfig.json
└── env.example              # 环境变量示例
```

## 🗄️ 数据库结构

### 核心表结构
- **users**: 用户表
- **providers**: LLM厂商配置表
- **models**: 模型表
- **prompts**: 提示词表
- **test_runs**: 测试运行表
- **test_results**: 测试结果表
- **test_logs**: 测试日志表
- **system_configs**: 系统配置表

## 🔧 安装和配置

### 1. 安装依赖
```bash
cd server
npm install
```

### 2. 配置环境变量
```bash
# 复制环境变量模板
cp env.example .env

# 编辑环境变量
vim .env
```

### 3. 配置数据库
```bash
# 创建MySQL数据库
mysql -u root -p
CREATE DATABASE llm_test_db;

# 生成Prisma客户端
npm run db:generate

# 推送数据库结构
npm run db:push

# 或者运行迁移
npm run db:migrate
```

### 4. 启动服务
```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

## 📖 API文档

启动服务后访问: `http://localhost:8001/api-docs`

### 主要API端点

#### 🔐 认证相关 (`/api/auth`)
- `POST /login` - 用户登录
- `POST /register` - 用户注册
- `POST /refresh` - 刷新令牌

#### 🤖 LLM厂商管理 (`/api/providers`)
- `GET /` - 获取厂商列表
- `POST /` - 创建厂商配置
- `PUT /:id` - 更新厂商配置
- `DELETE /:id` - 删除厂商配置

#### 📝 提示词管理 (`/api/prompts`)
- `GET /` - 获取提示词列表
- `POST /` - 创建提示词
- `PUT /:id` - 更新提示词
- `DELETE /:id` - 删除提示词

#### 🧪 测试运行 (`/api/tests`)
- `GET /` - 获取测试运行列表
- `POST /` - 创建测试运行
- `GET /:id` - 获取测试运行详情
- `POST /:id/start` - 启动测试
- `POST /:id/stop` - 停止测试
- `DELETE /:id` - 删除测试运行
- `POST /:id/logs` - 添加测试日志
- `GET /:id/logs` - 获取测试日志

#### 📊 数据分析 (`/api/analytics`)
- `GET /dashboard` - 仪表板数据
- `GET /reports` - 测试报告
- `GET /statistics` - 统计数据

## 🔌 Socket.io事件

### 测试相关事件
- `test:start` - 测试开始
- `test:progress` - 测试进度更新
- `test:log` - 实时日志
- `test:complete` - 测试完成
- `test:error` - 测试错误

### 使用示例
```javascript
// 前端连接Socket.io
const socket = io('http://localhost:8001');

// 监听测试进度
socket.on('test:progress', (data) => {
  console.log('测试进度:', data);
});

// 监听实时日志
socket.on('test:log', (log) => {
  console.log('测试日志:', log);
});
```

## 🛡️ 安全特性

- **JWT认证**: 基于令牌的身份验证
- **限流保护**: 防止API滥用
- **错误处理**: 统一的错误处理机制
- **日志记录**: 完整的操作日志
- **CORS配置**: 跨域请求控制

## 📊 监控和日志

### 日志文件
- `logs/combined.log` - 所有日志
- `logs/error.log` - 错误日志

### 健康检查
- `GET /health` - 服务健康状态

### 数据库管理
```bash
# 打开Prisma Studio
npm run db:studio
```

## 🚀 部署

### Docker部署
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 8001
CMD ["npm", "start"]
```

### PM2部署
```bash
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start dist/index.js --name llm-test-backend

# 查看状态
pm2 status
```

## 🔍 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查MySQL服务是否启动
   - 验证DATABASE_URL配置
   - 确认数据库用户权限

2. **Prisma错误**
   ```bash
   # 重新生成客户端
   npm run db:generate
   
   # 重置数据库
   npx prisma db push --force-reset
   ```

3. **端口占用**
   ```bash
# 查找占用端口的进程
lsof -i :8001

# 杀死进程
kill -9 <PID>
```

## 📈 性能优化

- 数据库索引优化
- 连接池配置
- 缓存策略
- 日志轮转
- 内存监控

## 🤝 开发指南

### 添加新API端点
1. 在`src/routes/`创建路由文件
2. 在`src/index.ts`中注册路由
3. 添加相应的数据库模型
4. 编写API文档注释

### 数据库迁移
```bash
# 创建迁移
npx prisma migrate dev --name add_new_feature

# 应用迁移
npx prisma migrate deploy
```

## 📝 许可证

MIT License

## 👥 贡献

欢迎提交Issue和Pull Request！ 