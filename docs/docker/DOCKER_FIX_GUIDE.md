# 🐳 Docker部署问题修复指南

## 🔧 已修复的问题

### 1. Dockerfile优化
- ✅ 修复了多阶段构建中的文件复制问题
- ✅ 添加了健康检查
- ✅ 优化了依赖安装流程
- ✅ 修复了权限问题
- ✅ 添加了必要的工具（curl）

### 2. 构建优化
- ✅ 创建了 `.dockerignore` 文件减少构建上下文
- ✅ 修复了端口配置不一致问题
- ✅ 优化了镜像大小

### 3. 部署脚本改进
- ✅ 修复了环境变量配置问题
- ✅ 添加了自动配置文件创建
- ✅ 改进了错误处理

## 🚀 快速测试和部署

### 1. 测试Docker构建
```bash
# 运行构建测试
./test-docker-build.sh

# 如果测试通过，继续部署
```

### 2. 生产部署
```bash
# 方法1: 一键部署
./deploy-docker.sh prod

# 方法2: 手动部署
docker-compose -f docker-compose.prod.yml up -d
```

### 3. 检查部署状态
```bash
# 检查容器状态
./docker-monitor.sh status

# 健康检查
./docker-monitor.sh health

# 查看日志
./docker-monitor.sh logs 50
```

## 🔍 常见问题解决

### 问题1: 构建失败 - 找不到文件
**症状**: `COPY failed: file not found`

**解决方案**:
```bash
# 检查文件是否存在
ls -la server/package.json
ls -la server/src/

# 如果缺少文件，检查项目结构
./check-deployment.sh docker
```

### 问题2: 容器启动失败
**症状**: 容器启动后立即退出

**解决方案**:
```bash
# 查看容器日志
docker logs nxlink-webtools

# 检查环境变量配置
cat .env.production

# 重新创建配置文件
cp env.production.template .env.production
vim .env.production
```

### 问题3: 健康检查失败
**症状**: 容器显示 unhealthy

**解决方案**:
```bash
# 进入容器检查
docker exec -it nxlink-webtools sh

# 手动测试健康检查
curl http://localhost:8450/health

# 检查进程状态
ps aux | grep node
```

### 问题4: 端口访问问题
**症状**: 无法访问应用

**解决方案**:
```bash
# 检查端口映射
docker port nxlink-webtools

# 检查防火墙
sudo ufw status

# 测试端口连通性
telnet localhost 8350
```

## 📋 部署前检查清单

### 必要文件检查
- [ ] `Dockerfile` 存在且正确
- [ ] `docker-compose.prod.yml` 配置正确
- [ ] `.env.production` 已配置
- [ ] `server/package.json` 存在
- [ ] `server/src/` 目录存在

### 环境配置检查
- [ ] `JWT_SECRET` 已修改（不是默认值）
- [ ] `ADMIN_PASSWORD` 已设置强密码
- [ ] `CORS_ORIGIN` 配置了正确的域名
- [ ] 端口配置一致（8350/8450）

### 系统要求检查
- [ ] Docker 20.10+ 已安装
- [ ] docker-compose 2.0+ 已安装
- [ ] 至少2GB可用内存
- [ ] 至少5GB可用磁盘空间

## 🛠️ 故障排除命令

### 构建相关
```bash
# 清理Docker缓存
docker system prune -f
docker builder prune -f

# 重新构建镜像
docker-compose -f docker-compose.prod.yml build --no-cache

# 查看构建日志
docker-compose -f docker-compose.prod.yml build --progress=plain
```

### 运行时相关
```bash
# 查看容器状态
docker-compose -f docker-compose.prod.yml ps

# 查看详细日志
docker-compose -f docker-compose.prod.yml logs -f

# 重启服务
docker-compose -f docker-compose.prod.yml restart

# 完全重新部署
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### 调试相关
```bash
# 进入容器调试
docker exec -it nxlink-webtools sh

# 查看容器内文件
docker exec nxlink-webtools ls -la /app

# 查看环境变量
docker exec nxlink-webtools env

# 测试内部连接
docker exec nxlink-webtools curl http://localhost:8450/health
```

## 📊 性能优化建议

### 1. 镜像优化
- 使用多阶段构建减少镜像大小
- 合理使用 `.dockerignore`
- 使用 Alpine Linux 基础镜像

### 2. 运行时优化
```bash
# 设置内存限制
docker run --memory=1g nxlink-webtools

# 设置CPU限制
docker run --cpus=1.0 nxlink-webtools

# 使用健康检查
# 已在Dockerfile中配置
```

### 3. 生产环境建议
- 使用外部数据库
- 配置日志轮转
- 设置监控告警
- 定期备份数据

## 🔒 安全建议

### 1. 容器安全
- 使用非root用户运行（已配置）
- 限制容器权限
- 定期更新基础镜像

### 2. 网络安全
```bash
# 只暴露必要端口
ports:
  - "8350:8350"  # 只暴露网关端口

# 使用内部网络
networks:
  - nxlink-network
```

### 3. 数据安全
- 使用强密码
- 定期轮换密钥
- 加密敏感数据

## 📞 获取帮助

如果遇到问题：

1. **运行诊断脚本**:
   ```bash
   ./check-deployment.sh docker
   ./test-docker-build.sh
   ```

2. **查看详细日志**:
   ```bash
   ./docker-monitor.sh logs 100
   ./docker-monitor.sh errors 1h
   ```

3. **收集系统信息**:
   ```bash
   docker version
   docker-compose version
   docker system info
   ```

---

**🎉 修复完成！现在可以正常使用Docker部署了。**