# Docker部署指南 - NxLink WebTools

## 📋 概述

本项目支持完整的Docker容器化部署，包含前端构建、后端服务和Nginx反向代理。

## 🏗️ Docker架构

- **多阶段构建**: 优化镜像大小
- **前端构建**: Node.js + Vite
- **后端构建**: Node.js + TypeScript
- **生产运行**: 轻量级Alpine Linux
- **反向代理**: Nginx + SSL支持

## 📁 项目结构

```
nxlinkWebTools/
├── Dockerfile              # 多阶段构建配置
├── docker-compose.yml      # 容器编排配置
├── nginx.conf              # Nginx反向代理配置
├── config/
│   └── production.env.example  # 环境配置示例
├── server/config/
│   └── api-keys.json       # API密钥配置
└── logs/                   # 运行时日志目录
```

## 🚀 快速部署步骤

### 1. 准备工作

```bash
# 克隆项目（如果还没有）
git clone <repository-url>
cd nxlinkWebTools

# 创建必要的目录
mkdir -p logs uploads ssl server/config

# 复制并配置环境变量
cp config/production.env.example .env.production
```

### 2. 配置环境变量

编辑 `.env.production` 文件：

```bash
# 服务配置
NODE_ENV=production
PORT=8450
CORS_ORIGIN=https://your-domain.com

# JWT配置（请使用强密码）
JWT_SECRET=your-production-jwt-secret-key-here-32-chars-minimum

# 超管密码
ADMIN_PASSWORD=your-secure-admin-password

# 日志级别
LOG_LEVEL=warn

# OpenAPI配置（如果需要）
OPENAPI_ACCESS_KEY=your-openapi-access-key
OPENAPI_ACCESS_SECRET=your-openapi-access-secret
```

### 3. 配置API密钥

编辑 `server/config/api-keys.json`：

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-08-31T00:00:00.000Z",
  "keys": [
    {
      "apiKey": "your-api-key-here",
      "alias": "生产环境",
      "description": "生产环境API密钥",
      "hasOpenApiConfig": true,
      "openApiBaseUrl": "https://api-westus.nxlink.ai",
      "bizType": "8",
      "isFromEnv": false,
      "openapi": {
        "accessKey": "your-access-key",
        "accessSecret": "your-access-secret",
        "bizType": "8",
        "baseUrl": "https://api-westus.nxlink.ai"
      }
    }
  ]
}
```

### 4. 配置SSL证书（可选）

如果需要HTTPS，请准备SSL证书：

```bash
# 创建SSL证书目录
mkdir -p ssl

# 将证书文件放入目录
# ssl/cert.pem - SSL证书
# ssl/key.pem  - SSL私钥
```

### 5. Docker构建和启动

```bash
# 构建并启动服务
docker-compose up -d --build

# 查看启动日志
docker-compose logs -f nxlink-app

# 查看服务状态
docker-compose ps
```

### 6. 验证部署

```bash
# 检查服务健康状态
curl http://localhost:8350/health

# 检查前端页面
curl http://localhost:8350/

# 检查API接口
curl http://localhost:8350/api/health
```

## 🔧 详细配置说明

### Dockerfile详解

```dockerfile
# 多阶段构建优化
FROM node:16-alpine AS frontend-builder
# 构建前端静态文件

FROM node:16-alpine AS backend-builder
# 编译TypeScript后端代码

FROM node:16-alpine
# 生产环境镜像
```

### docker-compose.yml配置

```yaml
version: '3.8'
services:
  nxlink-app:
    build: .
    ports:
      - "8350:8350"  # 网关端口
      - "8450:8450"  # 后端端口
    environment:
      - NODE_ENV=production
    volumes:
      - ./logs:/app/logs
      - ./server/config/api-keys.json:/app/server/config/api-keys.json
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8450/health"]
```

### Nginx配置要点

- **反向代理**: 将API请求转发到后端
- **WebSocket支持**: 支持实时通信
- **SSL配置**: HTTPS安全连接
- **缓存策略**: 静态资源缓存优化
- **安全头**: 添加安全响应头

## 🔒 安全配置

### 1. 环境变量安全

```bash
# 生成强JWT密钥
openssl rand -hex 32

# 使用强密码
ADMIN_PASSWORD="$(openssl rand -base64 12)"
```

### 2. 文件权限

```bash
# 设置配置文件权限
chmod 600 .env.production
chmod 600 server/config/api-keys.json

# 设置日志目录权限
chmod 755 logs
```

### 3. 防火墙配置

```bash
# 只开放必要端口
# 80 (HTTP), 443 (HTTPS), 8350 (应用端口)
# 关闭不必要的端口: 8450 (内部后端端口)
```

## 📊 监控和维护

### 1. 查看日志

```bash
# 查看应用日志
docker-compose logs -f nxlink-app

# 查看Nginx日志
docker-compose logs -f nginx

# 查看特定时间段日志
docker-compose logs --since "2025-08-31" nxlink-app
```

### 2. 健康检查

```bash
# 应用健康检查
curl http://localhost:8350/health

# Docker健康检查
docker-compose ps
docker stats
```

### 3. 备份策略

```bash
# 备份配置文件
tar -czf backup-$(date +%Y%m%d).tar.gz \
  server/config/api-keys.json \
  .env.production \
  logs/

# 备份数据库（如果使用SQLite）
cp server/database.db server/database-$(date +%Y%m%d).db
```

## 🔄 更新部署

### 1. 代码更新

```bash
# 拉取最新代码
git pull origin main

# 重建镜像
docker-compose build --no-cache

# 滚动更新
docker-compose up -d
```

### 2. 零停机更新

```bash
# 创建新版本
docker-compose up -d --scale nxlink-app=2

# 等待新实例就绪
sleep 30

# 停止旧实例
docker-compose up -d --scale nxlink-app=1
```

## 🐛 故障排除

### 常见问题

#### 1. 端口占用

```bash
# 检查端口占用
lsof -i :8350
lsof -i :8450

# 修改端口映射
# 编辑 docker-compose.yml
ports:
  - "8351:8350"  # 修改外部端口
```

#### 2. 权限问题

```bash
# 检查文件权限
ls -la server/config/api-keys.json

# 修复权限
chmod 644 server/config/api-keys.json
```

#### 3. 构建失败

```bash
# 清理Docker缓存
docker system prune -f

# 重新构建
docker-compose build --no-cache
```

#### 4. 内存不足

```bash
# 检查系统资源
docker system df
free -h

# 增加Docker内存限制
# Docker Desktop -> Settings -> Resources
```

### 日志分析

```bash
# 查看错误日志
docker-compose logs nxlink-app | grep -i error

# 查看特定组件日志
docker-compose logs nxlink-app | grep "OpenAPI"

# 导出日志用于分析
docker-compose logs nxlink-app > app-$(date +%Y%m%d).log
```

## 📈 性能优化

### 1. Docker优化

```yaml
# docker-compose.yml优化配置
services:
  nxlink-app:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 2. Nginx优化

```nginx
# 启用缓存
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# 启用压缩
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

### 3. Node.js优化

```bash
# 使用PM2集群模式
NODE_ENV=production node start.js prod

# 设置内存限制
node --max-old-space-size=512 start.js prod
```

## 🌐 生产环境部署

### 1. 域名配置

```bash
# 配置DNS
# your-domain.com -> 服务器IP

# 获取SSL证书 (Let's Encrypt)
certbot certonly --nginx -d your-domain.com
```

### 2. 反向代理配置

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://nxlink-app:8350;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. 监控配置

```bash
# 安装监控工具
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  prom/prometheus

# 配置告警
# AlertManager + Prometheus + Grafana
```

## 📚 相关文档

- [API文档](./docs/public-api-documentation.md)
- [表单集成指南](./docs/external-form-integration.md)
- [部署故障排除](./docs/nginx-troubleshooting.drawio.xml)
- [配置指南](./config/README.md)

## 🎯 快速命令参考

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 更新部署
docker-compose pull && docker-compose up -d

# 清理资源
docker-compose down -v --rmi all
```
