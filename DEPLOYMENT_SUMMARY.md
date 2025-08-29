# 🚀 nxlinkWebTools 部署快速指南

## 一、配置已完成项

### ✅ CORS和域名配置
- 已配置支持多域名：
  - https://sit2025.nxlink.ai
  - https://nxlink.ai
  - https://nxlink.nxcloud.com
  - https://nxcloud.com
- 后端会自动解析并支持这些域名的跨域请求

### ✅ 内部路由支持
所有内部路由都支持生产环境：
- `/api/openapi/*` - OpenAPI接口
- `/internal-api/*` - 内部管理API
- `/api/hk`, `/api/chl` - 数据中心代理
- WebSocket连接 - 实时通信

## 二、部署方式选择

### 方式1：传统部署（推荐）
```bash
# 1. 本地打包
./build.sh

# 2. 上传到服务器
scp releases/nxlinkWebTools_*.tar.gz user@server:/path/

# 3. 服务器部署
ssh user@server
tar -xzf nxlinkWebTools_*.tar.gz
cd build_*
cp production.env.example production.env
vim production.env  # 配置环境变量
./deploy.sh
pm2 start ecosystem.config.js
```

### 方式2：Docker部署
```bash
# 1. 构建镜像
docker build -t nxlink-webtools .

# 2. 使用docker-compose
docker-compose up -d

# 或单独运行
docker run -d \
  -p 8350:8350 \
  -e JWT_SECRET=your-secret \
  -e ADMIN_PASSWORD=your-password \
  -v $(pwd)/logs:/app/logs \
  nxlink-webtools
```

## 三、必须配置项

### 1. production.env
```bash
# 必须修改的配置
JWT_SECRET=生成一个强随机密钥
ADMIN_PASSWORD=设置超管密码

# 可选配置
CORS_ORIGIN=如需修改允许的域名
LOG_LEVEL=生产环境建议用warn
```

### 2. 端口配置
- **网关**: 8350（对外服务）
- **后端**: 8450（内部服务）
- 确保防火墙开放8350端口

## 四、部署后验证

```bash
# 1. 检查服务状态
pm2 status

# 2. 健康检查
curl http://localhost:8450/health
curl http://localhost:8350/internal-api/keys/list

# 3. 查看日志
pm2 logs

# 4. 访问前端
# 浏览器打开 http://your-server:8350
```

## 五、常见问题快速解决

### 端口占用
```bash
lsof -i :8350
kill -9 <PID>
```

### 依赖安装慢
```bash
npm install --registry=https://registry.npmmirror.com
```

### 权限问题
```bash
chmod +x start.js deploy.sh
chmod 600 production.env
```

## 六、安全建议

1. **使用Nginx反向代理**：配置已提供
2. **启用HTTPS**：使用Let's Encrypt
3. **定期更新密钥**：JWT_SECRET和ADMIN_PASSWORD
4. **限制访问**：使用防火墙规则

---

📝 详细部署文档：[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
