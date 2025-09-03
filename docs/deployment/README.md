# 🚀 部署文档

本目录包含项目部署相关的所有文档和指南。

## 📁 目录内容

```
docs/deployment/
├── DEPLOYMENT_GUIDE.md          # 部署详细指南 ⭐⭐⭐⭐⭐
├── DEPLOYMENT_SUMMARY.md        # 部署总结 ⭐⭐⭐⭐
├── FIX_GUIDE.md                 # 问题修复指南 ⭐⭐⭐⭐
├── fix-redirect.md              # 重定向修复指南 ⭐⭐⭐
└── README.md                    # 本说明文档
```

## 📋 文档说明

### 核心部署文档

#### `DEPLOYMENT_GUIDE.md` ⭐⭐⭐⭐⭐
完整的项目部署指南，包含从环境准备到生产部署的完整流程。

**内容特色**:
- 🏗️ 完整的部署流程
- 🔧 环境配置步骤
- 📋 前置要求检查
- 🐳 Docker和传统部署方案
- 📊 性能监控配置

**适用场景**: 完整项目部署

#### `DEPLOYMENT_SUMMARY.md` ⭐⭐⭐⭐
部署总结文档，快速了解项目部署状态和关键信息。

**内容特色**:
- 📊 部署状态概览
- 🎯 关键配置清单
- ✅ 检查清单
- 🚨 常见问题汇总

**适用场景**: 部署状态检查、快速参考

### 问题解决文档

#### `FIX_GUIDE.md` ⭐⭐⭐⭐
部署问题诊断和修复指南。

**内容特色**:
- 🔍 问题诊断流程
- 🛠️ 修复方案
- 📝 错误日志分析
- 💡 最佳实践

**适用场景**: 部署遇到问题时的故障排除

#### `fix-redirect.md` ⭐⭐⭐
重定向相关问题修复指南。

**内容特色**:
- 🔄 重定向配置
- 🌐 URL重写规则
- 🔗 路由修复
- 📋 测试验证

**适用场景**: 重定向和路由相关问题

## 🚀 部署流程

### 快速部署流程

#### 方式一：Docker部署（推荐）
```bash
# 1. 环境准备
git clone <repository-url>
cd nxlinkWebTools

# 2. 查看部署指南
cat docs/deployment/DEPLOYMENT_GUIDE.md

# 3. 配置环境
cp docs/env/.env.production.template .env.production
nano .env.production

# 4. Docker部署
docker-compose -f docker-compose.prod.yml up -d

# 5. 验证部署
curl http://localhost:8400
```

#### 方式二：传统部署
```bash
# 1. 环境准备
sudo apt update && sudo apt install nodejs npm nginx

# 2. 部署应用
npm install
npm run build
npm start

# 3. 配置Nginx
cp docs/nginx/nginx-webtools-optimized.conf /etc/nginx/nginx.conf
sudo nginx -s reload
```

### 部署验证

#### 健康检查
```bash
# API健康检查
curl http://localhost:8400/api/health

# 前端页面检查
curl -I http://localhost:8400

# 服务状态检查
sudo systemctl status nxlink-webtools
```

#### 日志检查
```bash
# 查看应用日志
tail -f logs/combined.log

# 查看Nginx日志
sudo tail -f /var/log/nginx/access.log

# 查看系统日志
sudo journalctl -u nxlink-webtools -f
```

## 🔧 配置管理

### 环境配置
```bash
# 生产环境配置
cp docs/env/.env.production.template .env.production

# 编辑关键配置
nano .env.production
```

### 服务配置
```bash
# Systemd服务配置
sudo nano /etc/systemd/system/nxlink-webtools.service

# Nginx配置
sudo cp docs/nginx/nginx-webtools-optimized.conf /etc/nginx/nginx.conf
```

## 📊 监控部署

### 应用监控
```bash
# 进程监控
ps aux | grep node

# 端口监控
netstat -tlnp | grep 8400

# 资源使用
top -p $(pgrep node)
```

### 系统监控
```bash
# 磁盘使用
df -h

# 内存使用
free -h

# 网络连接
netstat -tlnp
```

## 🔍 故障排除

### 部署失败
```bash
# 检查服务状态
sudo systemctl status nxlink-webtools

# 查看错误日志
sudo journalctl -u nxlink-webtools -n 50

# 检查端口占用
lsof -i :8400
```

### 性能问题
```bash
# CPU使用分析
top -c

# 内存分析
pmap $(pgrep node)

# 网络分析
iftop
```

### 配置问题
```bash
# 验证配置文件
node -c config/project.config.ts

# 测试Nginx配置
sudo nginx -t

# 检查环境变量
env | grep NODE_ENV
```

## 📈 性能优化

### 应用优化
```bash
# 启用集群模式
NODE_ENV=production node server.js

# 设置内存限制
node --max-old-space-size=1024 server.js

# 启用压缩
# 在Nginx配置中启用gzip
```

### 系统优化
```bash
# 调整系统限制
sudo nano /etc/security/limits.conf

# 内核参数调优
sudo sysctl -w net.core.somaxconn=1024

# 文件描述符限制
ulimit -n 65536
```

## 🔄 更新部署

### 滚动更新
```bash
# 停止服务
sudo systemctl stop nxlink-webtools

# 备份当前版本
cp -r . /backup/$(date +%Y%m%d_%H%M%S)

# 更新代码
git pull origin main

# 重新部署
npm install
npm run build
sudo systemctl start nxlink-webtools
```

### 零停机更新
```bash
# 使用PM2集群模式
pm2 reload ecosystem.config.js

# 或使用Docker滚动更新
docker-compose up -d --scale webtools=2
sleep 30
docker-compose up -d --scale webtools=1
```

## 📋 部署清单

### 前置检查
- [ ] 服务器资源充足（CPU、内存、磁盘）
- [ ] 网络连接正常
- [ ] 域名DNS配置正确
- [ ] SSL证书准备就绪

### 环境配置
- [ ] Node.js版本符合要求
- [ ] 依赖包安装完成
- [ ] 环境变量配置正确
- [ ] 数据库连接正常

### 安全配置
- [ ] 防火墙规则配置
- [ ] SSL证书安装
- [ ] 文件权限设置正确
- [ ] 敏感信息加密存储

### 监控配置
- [ ] 日志收集配置
- [ ] 监控告警设置
- [ ] 备份策略配置
- [ ] 应急预案准备

## 📚 相关文档

- [Docker部署](../docker/README.md)
- [Nginx配置](../nginx/README.md)
- [环境配置](../env/README.md)
- [项目配置](../../config/README.md)

## 🔗 外部链接

- [PM2进程管理](https://pm2.keymetrics.io/)
- [Systemd服务管理](https://www.freedesktop.org/software/systemd/man/systemd.service.html)
- [Nginx部署最佳实践](https://www.nginx.com/blog/deploying-nginx-plus-as-an-api-gateway/)

---

**最后更新**: 2025年1月
**维护者**: 开发团队
