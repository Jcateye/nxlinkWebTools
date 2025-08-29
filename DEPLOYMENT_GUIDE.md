# nxlinkWebTools 生产环境部署指南

## 📋 部署前准备

### 1. 系统要求
- **操作系统**: Linux (推荐 Ubuntu 20.04+ 或 CentOS 7+)
- **Node.js**: 16.x 或更高版本
- **内存**: 最低 2GB，推荐 4GB+
- **磁盘空间**: 最低 2GB 可用空间

### 2. 安装必要软件
```bash
# 安装 Node.js 16.x
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version  # 应显示 v16.x.x
npm --version   # 应显示 8.x.x

# 安装 PM2（进程管理器）
sudo npm install -g pm2
```

## 🚀 快速部署步骤

### 1. 本地打包
```bash
# 在开发机器上执行
./build.sh

# 打包完成后会生成文件：
# releases/nxlinkWebTools_YYYYMMDD_HHMMSS.tar.gz
```

### 2. 上传到服务器
```bash
# 使用 scp 上传
scp releases/nxlinkWebTools_*.tar.gz user@your-server:/home/user/

# 或使用 rsync
rsync -avz releases/nxlinkWebTools_*.tar.gz user@your-server:/home/user/
```

### 3. 服务器部署
```bash
# SSH 登录服务器
ssh user@your-server

# 解压文件
tar -xzf nxlinkWebTools_*.tar.gz
cd build_*

# 配置环境变量
cp production.env.example production.env
vim production.env  # 编辑配置文件

# 运行部署脚本
./deploy.sh

# 启动服务
pm2 start ecosystem.config.js
```

## 📝 配置说明

### production.env 配置项

```bash
# 服务配置
NODE_ENV=production                    # 环境标识，必须为 production
PORT=8450                              # 后端服务端口
BACKEND_PORT=8450                      # 网关连接的后端端口
CORS_ORIGIN=https://sit2025.nxlink.ai,https://nxlink.ai  # 允许的域名，逗号分隔

# 安全配置
JWT_SECRET=your-secure-random-string   # JWT密钥，请使用强随机字符串
ADMIN_PASSWORD=your-admin-password     # 超管密码，用于查看完整API Key

# 日志配置
LOG_LEVEL=warn                         # 日志级别：error, warn, info, debug

# OpenAPI配置（可选）
OPENAPI_ACCESS_KEY=                    # 如需默认OpenAPI配置
OPENAPI_ACCESS_SECRET=                 # 如需默认OpenAPI配置
```

### 端口配置
- **网关服务**: 8350 (对外提供服务)
- **后端服务**: 8450 (内部服务)
- **开发环境避免冲突**:
  - 开发前端: 3010
  - 开发后端: 8400

## 🔧 进程管理

### 使用 PM2 管理

创建 `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'nxlink-backend',
      script: './server-dist/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 8450
      },
      instances: 2,          // 启动2个实例
      exec_mode: 'cluster',  // 集群模式
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true
    },
    {
      name: 'nxlink-gateway',
      script: './server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 8350,
        BACKEND_PORT: 8450
      },
      instances: 1,
      error_file: './logs/gateway-error.log',
      out_file: './logs/gateway-out.log',
      log_file: './logs/gateway-combined.log',
      time: true
    }
  ]
};
```

PM2 常用命令：
```bash
# 启动服务
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs

# 重启服务
pm2 restart all

# 停止服务
pm2 stop all

# 保存当前进程列表
pm2 save

# 设置开机自启
pm2 startup
```

### 使用 systemd 管理（可选）

创建服务文件 `/etc/systemd/system/nxlink.service`:
```ini
[Unit]
Description=nxlinkWebTools Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/nxlinkWebTools
ExecStart=/usr/bin/node start.js prod
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

systemd 命令：
```bash
# 重新加载配置
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start nxlink

# 查看状态
sudo systemctl status nxlink

# 设置开机自启
sudo systemctl enable nxlink
```

## 🔒 安全建议

### 1. 防火墙配置
```bash
# 只开放必要端口
sudo ufw allow 8350/tcp  # 网关端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP（如果需要）
sudo ufw allow 443/tcp   # HTTPS（如果需要）
sudo ufw enable
```

### 2. Nginx 反向代理（推荐）
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8350;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket 支持
    location /socket.io/ {
        proxy_pass http://localhost:8350;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 3. 环境变量安全
- 使用强密码和密钥
- 不要将 production.env 提交到版本控制
- 定期更新密钥和密码
- 限制文件权限：`chmod 600 production.env`

## 📊 监控和日志

### 1. 日志位置
- PM2 日志: `~/.pm2/logs/`
- 应用日志: `./logs/`
- 系统日志: `/var/log/syslog`

### 2. 监控命令
```bash
# 查看资源使用
pm2 monit

# 查看详细信息
pm2 info nxlink-backend

# 实时日志
pm2 logs --lines 100
```

### 3. 健康检查
```bash
# 检查后端健康状态
curl http://localhost:8450/health

# 检查网关状态
curl http://localhost:8350/internal-api/keys/list
```

## 🔄 更新部署

### 1. 零停机更新
```bash
# 上传新版本
scp releases/nxlinkWebTools_new.tar.gz user@server:/home/user/

# 解压到新目录
tar -xzf nxlinkWebTools_new.tar.gz
cd build_new

# 复制配置文件
cp ../build_old/production.env .

# 部署新版本
./deploy.sh

# 平滑重启
pm2 reload all
```

### 2. 回滚方案
```bash
# 保留旧版本目录
mv build_current build_backup

# 如需回滚
mv build_backup build_current
pm2 restart all
```

## 🚨 故障排查

### 常见问题

1. **端口被占用**
   ```bash
   # 查看端口占用
   sudo lsof -i :8350
   sudo lsof -i :8450
   
   # 杀死进程
   sudo kill -9 <PID>
   ```

2. **权限问题**
   ```bash
   # 设置正确权限
   chmod +x start.js deploy.sh
   chmod 600 production.env
   ```

3. **依赖安装失败**
   ```bash
   # 清理缓存
   npm cache clean --force
   
   # 使用淘宝镜像
   npm install --registry=https://registry.npmmirror.com
   ```

4. **内存不足**
   ```bash
   # 查看内存
   free -h
   
   # 创建 swap
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### 日志分析
```bash
# 查看错误日志
tail -f logs/backend-error.log

# 搜索特定错误
grep -n "ERROR" logs/*.log

# 查看最近的日志
pm2 logs --lines 200 --err
```

## 📞 支持联系

如遇到问题，请提供以下信息：
- 系统版本: `uname -a`
- Node.js 版本: `node --version`
- 错误日志: `pm2 logs --lines 100`
- 配置信息（隐藏敏感信息）

---

最后更新: 2025-08-29
