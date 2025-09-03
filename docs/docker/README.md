# 🐳 Docker部署文档

本目录包含项目Docker容器化部署的所有相关文档和指南。

## 📁 目录内容

```
docs/docker/
├── DOCKER_DEPLOY_README.md      # Docker部署快速指南 ⭐⭐⭐⭐⭐
├── docker-deploy-guide.md       # Docker部署详细指南 ⭐⭐⭐⭐⭐
├── DOCKER_FIX_GUIDE.md          # Docker问题修复指南 ⭐⭐⭐⭐
└── README.md                    # 本说明文档
```

## 📋 文档说明

### 核心部署文档

#### `DOCKER_DEPLOY_README.md` ⭐⭐⭐⭐⭐
Docker部署快速指南，适合初次部署用户。

**内容特色**:
- 🚀 一键部署流程
- ⚡ 快速开始指南
- 📋 前置要求检查
- 🛠️ 常见问题解决

**适用场景**: 新用户快速上手部署

#### `docker-deploy-guide.md` ⭐⭐⭐⭐⭐
Docker部署详细指南，包含完整的部署方案和架构说明。

**内容特色**:
- 🏗️ Docker架构详解
- 📁 项目结构说明
- 🔧 高级配置选项
- 📊 性能优化建议

**适用场景**: 需要深入了解Docker部署的专业用户

#### `DOCKER_FIX_GUIDE.md` ⭐⭐⭐⭐
Docker部署问题诊断和修复指南。

**内容特色**:
- 🔍 问题诊断流程
- 🛠️ 修复方案
- 📝 错误日志分析
- 💡 最佳实践建议

**适用场景**: 部署遇到问题时的故障排除

## 🚀 快速开始

### 方式一：快速部署（推荐新用户）
```bash
# 1. 克隆项目
git clone <repository-url>
cd nxlinkWebTools

# 2. 使用快速指南
cat docs/docker/DOCKER_DEPLOY_README.md

# 3. 一键部署
docker-compose up -d
```

### 方式二：详细部署（推荐专业用户）
```bash
# 1. 详细了解架构
cat docs/docker/docker-deploy-guide.md

# 2. 自定义配置
nano docker-compose.yml

# 3. 高级部署
docker-compose -f docker-compose.prod.yml up -d
```

## 🏗️ Docker架构

```
NxLink WebTools Docker架构
├── Frontend (Node.js + Vite)     # 前端构建容器
├── Backend (Node.js + TS)       # 后端服务容器
├── Nginx                        # 反向代理容器
├── PostgreSQL/MySQL             # 数据库容器 (可选)
└── Redis                        # 缓存容器 (可选)
```

## 📋 部署环境

### 开发环境
```bash
# 开发环境部署
docker-compose -f docker-compose.yml up

# 带日志查看
docker-compose -f docker-compose.yml up -d && docker-compose logs -f
```

### 生产环境
```bash
# 生产环境部署
docker-compose -f docker-compose.prod.yml up -d

# 查看服务状态
docker-compose ps

# 查看服务日志
docker-compose logs webtools
```

## 🔧 配置管理

### 环境变量配置
```bash
# 使用环境配置模板
cp docs/env/.env.production.template .env.production

# 编辑生产环境配置
nano .env.production
```

### Docker Compose配置
```bash
# 自定义Docker配置
nano docker-compose.prod.yml

# 调整资源限制
services:
  webtools:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

## 📊 监控和维护

### 服务状态监控
```bash
# 查看所有服务状态
docker-compose ps

# 查看特定服务日志
docker-compose logs nginx

# 查看实时日志
docker-compose logs -f webtools
```

### 性能监控
```bash
# 查看资源使用
docker stats

# 查看容器磁盘使用
docker system df

# 清理Docker系统
docker system prune -a
```

## 🔍 故障排除

### 常见问题

1. **容器启动失败**
   ```bash
   # 查看详细错误日志
   docker-compose logs

   # 检查端口占用
   lsof -i :8400

   # 重启服务
   docker-compose restart
   ```

2. **网络连接问题**
   ```bash
   # 检查网络配置
   docker network ls

   # 重建网络
   docker-compose down && docker-compose up -d
   ```

3. **磁盘空间不足**
   ```bash
   # 查看磁盘使用
   df -h

   # 清理Docker缓存
   docker system prune -f
   ```

## 📈 性能优化

### 镜像优化
```bash
# 使用多阶段构建
FROM node:18-alpine AS builder

# 优化层缓存
COPY package*.json ./
RUN npm ci --only=production

# 使用轻量级基础镜像
FROM alpine:latest
```

### 资源配置
```yaml
services:
  webtools:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## 🔄 更新和升级

### 应用更新
```bash
# 停止服务
docker-compose down

# 拉取最新代码
git pull origin main

# 重新构建镜像
docker-compose build --no-cache

# 启动服务
docker-compose up -d
```

### 零停机更新
```bash
# 使用滚动更新
docker-compose up -d --scale webtools=2

# 等待新实例就绪
sleep 30

# 停止旧实例
docker-compose up -d --scale webtools=1
```

## 📚 相关文档

- [环境配置](../env/README.md)
- [Nginx配置](../nginx/README.md)
- [部署指南](../deployment/DEPLOYMENT_GUIDE.md)
- [项目配置](../../config/README.md)

## 🔗 外部链接

- [Docker官方文档](https://docs.docker.com/)
- [Docker Compose文档](https://docs.docker.com/compose/)
- [Docker最佳实践](https://docs.docker.com/develop/dev-best-practices/)

---

**最后更新**: 2025年1月
**维护者**: 开发团队
