# 🚀 nxlinkWebTools v1.1.0 发布说明

**发布时间**: 2025-09-02  
**发布包**: `nxlinkWebTools_20250902_170744.tar.gz`

## 🎯 主要修复和改进

### 🔧 环境配置修复
- **修复生产环境配置加载问题**: `npm run start:prod` 现在可以正确加载 `production.env` 配置文件
- **智能配置文件检测**: 支持 `.env.production`、`production.env`、`.env` 等多种配置文件格式
- **环境变量自动加载**: 根据运行环境自动选择对应的配置文件

### 🐳 Docker部署优化
- **修复Docker镜像构建问题**: 解决了多阶段构建中的文件复制错误
- **优化容器启动流程**: 添加健康检查和必要工具支持
- **改进端口配置**: 统一使用8350(网关)/8450(后端)端口
- **Docker环境适配**: 优化容器内的端口检查和进程管理

### 🛠️ 部署工具增强
- **新增部署检查脚本**: `check-deployment.sh` 自动验证部署配置
- **Docker测试工具**: `test-docker-build.sh` 和 `test-docker-quick.sh`
- **环境配置测试**: `test-env-loading.sh` 验证环境变量加载
- **完整的故障排除指南**: 详细的问题诊断和解决方案

### 📁 项目结构重构
- **后端结构优化**: 重新组织TypeScript项目结构
- **配置文件整理**: 移动配置文件到更合理的位置
- **构建流程改进**: 优化编译输出和依赖管理

## 🆕 新增功能

### 📋 配置模板和文档
- **环境配置模板**: `.env.production.template` 提供完整的配置示例
- **详细使用指南**: `ENV_CONFIG_GUIDE.md` 包含完整的配置说明
- **Docker修复指南**: `DOCKER_FIX_GUIDE.md` 提供Docker部署的完整解决方案

### 🔍 自动化测试
- **构建验证**: 自动测试Docker镜像构建和运行
- **配置验证**: 自动检查环境变量和配置文件
- **健康检查**: 验证服务启动和API可用性

## 🔄 破坏性变更

### 端口配置统一
- **网关端口**: 8300 → 8350
- **后端端口**: 保持8450不变
- **开发端口**: 前端3010，后端8400

### 配置文件路径
- **推荐使用**: `.env.production` (新)
- **兼容支持**: `production.env` (旧)
- **配置模板**: `.env.production.template`

## 📦 部署指南

### 快速部署
```bash
# 1. 解压发布包
tar -xzf nxlinkWebTools_20250902_170744.tar.gz
cd nxlinkWebTools_20250902_170744

# 2. 配置环境变量
cp production.env.example production.env
vim production.env  # 修改JWT_SECRET和ADMIN_PASSWORD

# 3. 部署服务
./deploy.sh

# 4. 启动服务
pm2 start ecosystem.config.js
```

### Docker部署
```bash
# 1. 配置环境
cp .env.production.template .env.production
vim .env.production

# 2. 一键部署
./deploy-docker.sh prod

# 3. 检查状态
./docker-monitor.sh status
```

## 🔍 验证部署

### 检查配置加载
启动时应该看到：
```
🔧 加载环境配置: .env.production
✅ 已加载 13 个环境变量
```

### 健康检查
```bash
# 后端健康检查
curl http://localhost:8450/health

# 前端访问
curl http://localhost:8350/
```

## 🐛 已知问题

1. **前端构建警告**: 某些依赖包使用了eval，不影响功能
2. **npm审计警告**: 存在一些依赖安全警告，建议定期更新
3. **Vite CJS警告**: 开发环境的兼容性警告，不影响生产使用

## 🔗 相关文档

- [环境配置指南](./ENV_CONFIG_GUIDE.md)
- [Docker部署指南](./DOCKER_FIX_GUIDE.md)
- [完整部署文档](./DEPLOYMENT_GUIDE.md)
- [部署检查脚本](./check-deployment.sh)

## 📞 技术支持

如遇到问题，请：
1. 运行 `./check-deployment.sh` 进行自动诊断
2. 查看相关文档和故障排除指南
3. 检查启动日志中的错误信息

---

**🎉 感谢使用 nxlinkWebTools！这个版本大大改进了部署体验和稳定性。**