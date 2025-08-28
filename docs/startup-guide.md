# 服务启动指南

nxlinkWebTools 项目包含两个主要服务：前端服务和后端服务。我们提供了统一的启动脚本来简化开发和部署流程。

## 服务架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端服务       │    │   后端服务       │    │  生产服务器      │
│  (Frontend)     │    │  (Backend)      │    │  (Server)       │
│                 │    │                 │    │                 │
│  端口: 3010     │◄───┤  端口: 8400     │    │  端口: 8300     │
│  技术: Vite+React│    │  技术: Node.js  │    │  技术: Express  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 快速启动

### 方式 1: 使用 npm 脚本（推荐）

```bash
# 启动开发环境（前端+后端）
npm run dev

# 启动生产环境（构建+后端+服务器）
npm run start:prod

# 启动测试环境
npm run start:test

# 只启动前端服务
npm run start:frontend

# 只启动后端服务
npm run start:backend

# 查看帮助信息
npm run help
```

### 方式 2: 直接使用启动脚本

```bash
# 启动开发环境所有服务
node start.js dev

# 启动生产环境所有服务
node start.js prod

# 启动指定服务
node start.js dev frontend        # 只启动前端
node start.js dev backend         # 只启动后端
node start.js prod backend server # 启动后端和服务器

# 查看完整帮助
node start.js --help
```

## 环境说明

### 开发环境 (dev)
- **前端**: Vite 开发服务器，支持热重载，端口 3010
- **后端**: ts-node 直接运行 TypeScript，支持热重载，端口 8400
- **特点**: 快速开发，自动重载，开发工具集成

### 生产环境 (prod)
- **前端**: 先构建静态文件，然后通过生产服务器提供
- **后端**: 编译后运行，端口 8400
- **服务器**: Express 服务器，处理静态文件和代理，端口 8300
- **特点**: 性能优化，生产就绪

### 测试环境 (test)
- **前端**: 测试模式运行，端口 3010
- **后端**: 测试环境配置，端口 8400
- **特点**: 测试配置，模拟生产环境

## 端口说明

| 服务 | 开发环境 | 生产环境 | 说明 |
|------|----------|----------|------|
| 前端 | 3010 | - | Vite 开发服务器 |
| 后端 | 8400 | 8400 | API 服务器 |
| 服务器 | - | 8300 | 生产环境入口 |

## 启动脚本特性

### 🚀 智能端口管理
- 自动检测端口占用
- 自动清理冲突进程
- 显示服务运行状态

### 🎨 彩色日志输出
- 不同服务使用不同颜色区分
- 清晰的启动和错误信息
- 实时日志输出

### 🔧 环境配置
- 自动设置 NODE_ENV
- 支持环境变量覆盖
- 智能工作目录管理

### 🛑 优雅退出
- Ctrl+C 优雅关闭所有服务
- 5秒超时强制退出
- 进程清理和资源释放

## 常见用法示例

### 日常开发
```bash
# 启动完整开发环境
npm run dev

# 只开发前端（后端已在其他地方运行）
npm run start:frontend

# 只开发后端 API
npm run start:backend
```

### 生产部署
```bash
# 完整生产环境部署
npm run start:prod

# 分步部署：先构建，再启动服务
node start.js prod frontend  # 构建前端
node start.js prod backend   # 启动后端
node start.js prod server    # 启动服务器
```

### 测试调试
```bash
# 测试环境
npm run start:test

# 查看服务状态
ps aux | grep node           # 查看运行的 Node.js 进程
lsof -i :3010               # 查看端口 3010 占用情况
lsof -i :8400               # 查看端口 8400 占用情况
```

## 故障排除

### 端口占用问题
```bash
# 手动清理端口（如果自动清理失败）
lsof -ti :3010 | xargs kill -9
lsof -ti :8400 | xargs kill -9
lsof -ti :8300 | xargs kill -9
```

### 依赖问题
```bash
# 重新安装依赖
npm install                 # 前端依赖
cd server && npm install    # 后端依赖
```

### 权限问题
```bash
# 确保启动脚本有执行权限
chmod +x start.js
```

### 日志调试
```bash
# 查看详细日志输出
NODE_ENV=development npm run dev

# 生产环境日志
NODE_ENV=production npm run start:prod
```

## 环境变量配置

在启动前，确保正确配置了环境变量：

```bash
# 开发环境
export NODE_ENV=development

# 生产环境
export NODE_ENV=production

# 自定义端口（可选）
export FRONTEND_PORT=3010
export BACKEND_PORT=8400
export SERVER_PORT=8300
```

## 注意事项

1. **首次启动**: 确保已安装所有依赖 (`npm install`)
2. **端口冲突**: 启动脚本会自动处理，但建议预先检查
3. **后端配置**: 确保 `server/` 目录下有正确的配置文件
4. **生产构建**: 生产环境会先构建前端，需要一些时间
5. **日志级别**: 可以通过环境变量调整日志输出级别

## 高级用法

### 自定义环境配置
可以修改 `start.js` 中的环境配置来适应特殊需求：

```javascript
// 添加新环境
const environments = {
  // ... 现有环境
  staging: {
    name: '预发布环境',
    frontend: { /* 配置 */ },
    backend: { /* 配置 */ }
  }
}
```

### 服务依赖管理
脚本支持服务间的依赖关系，比如生产环境会先构建前端再启动其他服务。

### 监控和日志
结合 PM2 或其他进程管理工具可以实现更高级的监控和日志管理。
