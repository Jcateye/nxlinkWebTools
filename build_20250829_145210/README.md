# nxlinkWebTools 生产部署包

构建时间: 20250829_145210

## 部署步骤

1. **配置环境变量**
   ```bash
   cp production.env.example production.env
   # 编辑 production.env 填入实际配置
   ```

2. **运行部署脚本**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

3. **启动服务**
   
   使用PM2（推荐）:
   ```bash
   pm2 start ecosystem.config.js
   ```
   
   或使用启动脚本:
   ```bash
   ./start.js prod
   ```

## 服务端口

- 网关服务: 8350
- 后端服务: 8450

## 注意事项

- 后端使用 ts-node 直接运行 TypeScript 代码
- 确保服务器已安装 Node.js 16+
- 建议使用 PM2 管理进程
