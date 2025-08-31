# 🚀 NxLink WebTools Docker部署快速指南

## 📋 前置要求

- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **系统**: Linux/macOS/Windows
- **内存**: 至少2GB可用内存
- **磁盘**: 至少5GB可用空间

## ⚡ 一键部署（推荐）

### 1. 克隆项目
```bash
git clone <repository-url>
cd nxlinkWebTools
```

### 2. 配置环境
```bash
# 复制环境配置模板
cp env.production.template .env.production

# 编辑配置文件，填入实际值
nano .env.production  # 或使用其他编辑器
```

### 3. 一键部署
```bash
# 生产环境部署
./deploy-docker.sh prod

# 或开发环境部署
./deploy-docker.sh dev
```

### 4. 验证部署
```bash
# 检查服务状态
./docker-monitor.sh status

# 健康检查
./docker-monitor.sh health
```

## 🔧 手动部署步骤

如果需要更精细的控制，可以按照以下步骤手动部署：

### 步骤1: 准备配置文件
```bash
# 创建必要目录
mkdir -p logs uploads server/config ssl

# 复制并编辑环境配置
cp env.production.template .env.production
nano .env.production

# 创建API密钥配置
nano server/config/api-keys.json
```

### 步骤2: 构建和启动
```bash
# 构建镜像
docker-compose -f docker-compose.prod.yml build

# 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 查看启动日志
docker-compose -f docker-compose.prod.yml logs -f nxlink-app
```

### 步骤3: 验证服务
```bash
# 检查容器状态
docker-compose -f docker-compose.prod.yml ps

# 测试应用
curl http://localhost:8350/health
curl http://localhost:8350/
```

## 📊 服务地址

部署成功后，可以通过以下地址访问：

- **前端应用**: http://localhost:8350
- **API接口**: http://localhost:8350/api
- **健康检查**: http://localhost:8350/health
- **Nginx状态** (可选): http://localhost:80

## 🛠️ 常用管理命令

### 服务管理
```bash
# 启动服务
./deploy-docker.sh prod start

# 停止服务
./deploy-docker.sh prod stop

# 重启服务
./deploy-docker.sh prod restart

# 查看状态
./docker-monitor.sh status
```

### 日志查看
```bash
# 查看应用日志
./docker-monitor.sh logs 100 nxlink-app

# 查看Nginx日志
./docker-monitor.sh logs 50 nginx

# 分析错误日志
./docker-monitor.sh errors 2h
```

### 监控和维护
```bash
# 健康检查
./docker-monitor.sh health

# 资源监控
./docker-monitor.sh resources

# 数据备份
./docker-monitor.sh backup
```

### 更新部署
```bash
# 拉取最新代码
git pull origin main

# 重建并重启
./deploy-docker.sh prod

# 或手动更新
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

## 🔧 故障排除

### 常见问题

#### 1. 端口冲突
```bash
# 检查端口占用
lsof -i :8350
lsof -i :8450

# 修改端口（编辑 .env.production）
GATEWAY_PORT=8351
BACKEND_PORT=8451
```

#### 2. 权限问题
```bash
# 修复文件权限
chmod 644 server/config/api-keys.json
chmod 600 .env.production
chmod 755 logs
```

#### 3. 内存不足
```bash
# 检查系统资源
free -h
df -h

# 清理Docker资源
docker system prune -f
```

#### 4. 构建失败
```bash
# 清理构建缓存
docker system prune -f
docker builder prune -f

# 重新构建
./deploy-docker.sh prod build
```

### 详细日志分析
```bash
# 查看详细错误日志
docker-compose -f docker-compose.prod.yml logs nxlink-app | grep -i error

# 查看容器资源使用
docker stats

# 进入容器调试
docker-compose -f docker-compose.prod.yml exec nxlink-app sh
```

## 🔒 安全配置

### 生产环境建议
```bash
# 1. 修改默认密码
ADMIN_PASSWORD=your-secure-password

# 2. 使用强JWT密钥
JWT_SECRET=your-32-char-jwt-secret

# 3. 配置HTTPS
# 编辑 nginx.conf，启用SSL配置

# 4. 限制访问
# 配置防火墙，只开放必要端口
```

### SSL证书配置
```bash
# 使用Let's Encrypt
certbot certonly --nginx -d your-domain.com

# 或使用自定义证书
mkdir -p ssl
cp your-cert.pem ssl/cert.pem
cp your-key.pem ssl/key.pem
```

## 📈 性能优化

### Docker优化
```bash
# 启用BuildKit
export DOCKER_BUILDKIT=1

# 使用多阶段构建缓存
docker build --target production .
```

### 应用优化
```bash
# 设置Node.js内存限制
NODE_OPTIONS="--max-old-space-size=1024"

# 启用PM2集群模式
pm2 start ecosystem.config.js --env production
```

## 🌐 生产环境部署

### 使用域名
```bash
# 1. 配置DNS解析
your-domain.com -> 服务器IP

# 2. 更新Nginx配置
server_name your-domain.com;

# 3. 启用HTTPS
ssl_certificate /etc/nginx/ssl/cert.pem;
ssl_certificate_key /etc/nginx/ssl/key.pem;
```

### 负载均衡
```bash
# 使用多个应用实例
docker-compose -f docker-compose.prod.yml up -d --scale nxlink-app=3

# 配置Nginx负载均衡
upstream nxlink_backend {
    server nxlink-app-1:8350;
    server nxlink-app-2:8350;
    server nxlink-app-3:8350;
}
```

## 📚 相关文档

- [详细部署指南](./docker-deploy-guide.md)
- [API文档](./docs/public-api-documentation.md)
- [配置说明](./config/README.md)
- [故障排除](./docs/nginx-troubleshooting.drawio.xml)

## 🎯 快速参考

| 命令 | 说明 |
|------|------|
| `./deploy-docker.sh prod` | 一键生产部署 |
| `./docker-monitor.sh status` | 查看服务状态 |
| `./docker-monitor.sh health` | 健康检查 |
| `./docker-monitor.sh logs` | 查看日志 |
| `./docker-monitor.sh backup` | 数据备份 |

## 📞 支持

如果遇到问题，请：

1. 查看日志：`./docker-monitor.sh logs`
2. 检查状态：`./docker-monitor.sh status`
3. 查看详细文档：[部署指南](./docker-deploy-guide.md)

---

**🎉 祝部署顺利！**
