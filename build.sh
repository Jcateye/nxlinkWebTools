#!/bin/bash
# nxlinkWebTools 生产环境打包脚本

set -e  # 遇到错误立即退出

echo "🚀 开始打包 nxlinkWebTools..."
echo ""

# 检查必要的命令
command -v node >/dev/null 2>&1 || { echo "❌ 需要安装 Node.js"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ 需要安装 npm"; exit 1; }

# 定义变量
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BUILD_DIR="build_${TIMESTAMP}"
RELEASE_DIR="releases"

# 创建构建目录
echo "📁 创建构建目录: ${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"
mkdir -p "${RELEASE_DIR}"

# 1. 安装依赖
echo ""
echo "📦 安装项目依赖..."
npm install --production=false

# 2. 构建前端
echo ""
echo "🎨 构建前端项目..."
npm run build

# 3. 构建后端
echo ""
echo "⚙️ 构建后端项目..."
cd server
echo "  安装后端依赖..."
npm install --production=false
echo "  编译 TypeScript..."
npm run build
cd ..

# 4. 准备打包文件
echo ""
echo "📋 准备打包文件..."

# 复制必要文件到构建目录
cp -r dist "${BUILD_DIR}/"                    # 前端构建产物
cp -r server/dist "${BUILD_DIR}/server-dist"  # 后端构建产物
cp -r server/config "${BUILD_DIR}/server-config" # 后端配置目录
cp -r server/public "${BUILD_DIR}/server-public" # 后端静态资源
cp -r config "${BUILD_DIR}/"                  # 项目配置
cp server.js "${BUILD_DIR}/"                  # 生产服务器
cp start.js "${BUILD_DIR}/"                    # 启动脚本
cp package.json "${BUILD_DIR}/"
cp package-lock.json "${BUILD_DIR}/"

# Docker相关文件
cp Dockerfile "${BUILD_DIR}/"                  # Docker构建文件
cp docker-compose.yml "${BUILD_DIR}/"         # 开发环境Docker配置
cp docker-compose.prod.yml "${BUILD_DIR}/"    # 生产环境Docker配置
cp nginx-external.conf "${BUILD_DIR}/"        # 外部Nginx配置
cp nginx-external-simple.conf "${BUILD_DIR}/" # 简化的外部Nginx配置
cp EXTERNAL_NGINX_GUIDE.md "${BUILD_DIR}/"    # 外部Nginx配置指南          

# 创建精简版 server package.json（只包含运行时依赖）
cd server
cp package.json "../${BUILD_DIR}/server-package.json"
cp package-lock.json "../${BUILD_DIR}/server-package-lock.json"
cd ..

# 5. 创建生产环境配置模板
echo ""
echo "📝 创建配置文件模板..."
cat > "${BUILD_DIR}/production.env.example" << EOF
# 生产环境配置
# 将此文件复制为 production.env 并填入实际值

# 服务配置
NODE_ENV=production
PORT=8450
BACKEND_PORT=8450
CORS_ORIGIN=https://sit2025.nxlink.ai,https://nxlink.ai,https://nxlink.nxcloud.com,https://nxcloud.com

# JWT配置
JWT_SECRET=your-production-jwt-secret-key-here

# 超管密码
ADMIN_PASSWORD=your-production-admin-password

# 日志级别
LOG_LEVEL=warn

# OpenAPI配置（可选）
# OPENAPI_ACCESS_KEY=your-production-openapi-access-key
# OPENAPI_ACCESS_SECRET=your-production-openapi-access-secret
# OPENAPI_BIZ_TYPE=8
# OPENAPI_BASE_URL=https://api-westus.nxlink.ai
EOF

# 6. 创建部署脚本
echo ""
echo "🔧 创建部署脚本..."
cat > "${BUILD_DIR}/deploy.sh" << 'EOF'
#!/bin/bash
# 生产环境部署脚本

set -e

echo "🚀 开始部署 nxlinkWebTools..."

# 1. 检查配置文件
if [ ! -f "production.env" ]; then
    echo "❌ 请先配置 production.env 文件"
    echo "   cp production.env.example production.env"
    echo "   然后编辑文件填入实际配置值"
    exit 1
fi

# 2. 加载环境变量
export $(cat production.env | grep -v '^#' | xargs)

# 3. 安装依赖
echo "📦 安装生产依赖..."
npm install --production

# 进入 server 目录安装后端依赖
mkdir -p server
cp server-package.json server/package.json
cp server-package-lock.json server/package-lock.json
cd server
npm install --production
cd ..

# 4. 设置权限
chmod +x start.js
chmod +x deploy.sh

echo ""
echo "✅ 部署准备完成！"
echo ""
echo "启动服务："
echo "  npm run start:prod"
echo ""
echo "或使用启动脚本："
echo "  ./start.js prod"
echo ""
EOF

chmod +x "${BUILD_DIR}/deploy.sh"

# 7. 创建 README
cat > "${BUILD_DIR}/README.md" << EOF
# nxlinkWebTools 生产部署包

构建时间: ${TIMESTAMP}

## 部署步骤

1. **配置环境变量**
   \`\`\`bash
   cp production.env.example production.env
   # 编辑 production.env 填入实际配置
   \`\`\`

2. **运行部署脚本**
   \`\`\`bash
   chmod +x deploy.sh
   ./deploy.sh
   \`\`\`

3. **启动服务**
   \`\`\`bash
   npm run start:prod
   # 或
   ./start.js prod
   \`\`\`

## Docker部署（推荐）

### 方法1：使用Docker Compose（推荐）
\`\`\`bash
# 1. 配置环境变量
cp production.env.example production.env
vim production.env  # 编辑配置

# 2. 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 3. 查看日志
docker-compose -f docker-compose.prod.yml logs -f
\`\`\`

### 方法2：使用外部Nginx + Docker
\`\`\`bash
# 1. 配置环境变量
cp production.env.example production.env
vim production.env

# 2. 启动应用容器
docker-compose -f docker-compose.prod.yml up -d nxlink-app

# 3. 配置外部Nginx
sudo cp nginx-external.conf /etc/nginx/sites-available/nxlink
sudo ln -s /etc/nginx/sites-available/nxlink /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
\`\`\`

### 方法3：直接使用Docker
\`\`\`bash
# 构建镜像
docker build -t nxlink-webtools:latest .

# 运行容器
docker run -d \
  --name nxlink-webtools \
  -p 8350:8350 \
  -p 8450:8450 \
  --env-file production.env \
  -v ./logs:/app/logs \
  -v ./server/config:/app/server/config \
  nxlink-webtools:latest
\`\`\`

## 服务端口

- 网关服务: 8350
- 后端服务: 8450

## 目录结构

### 应用文件
- \`dist/\` - 前端构建产物
- \`server-dist/\` - 后端构建产物
- \`server-config/\` - 后端配置文件
- \`server-public/\` - 后端静态资源
- \`config/\` - 项目配置
- \`server.js\` - 生产服务器入口
- \`start.js\` - 启动脚本

### Docker部署文件
- \`Dockerfile\` - Docker镜像构建文件
- \`docker-compose.yml\` - 开发环境Docker配置
- \`docker-compose.prod.yml\` - 生产环境Docker配置
- \`nginx-external.conf\` - 外部Nginx配置（生产环境）
- \`nginx-external-simple.conf\` - 外部Nginx配置（开发环境）
- \`EXTERNAL_NGINX_GUIDE.md\` - 外部Nginx配置指南

## 注意事项

### 传统部署
1. 确保服务器已安装 Node.js 16+
2. 确保配置文件中的敏感信息安全
3. 建议使用 PM2 或 systemd 管理进程

### Docker部署
1. 确保服务器已安装 Docker 和 Docker Compose
2. 确保端口 8350 和 8450 未被占用
3. 确保有足够的磁盘空间用于日志和上传文件
4. 生产环境建议配置外部Nginx进行反向代理
5. 定期清理Docker日志：`docker system prune -f`

### 安全建议
- 不要将 production.env 提交到版本控制
- 定期更新JWT密钥和管理员密码
- 配置防火墙只开放必要端口
- 使用强密码和安全的网络连接
EOF

# 8. 创建压缩包
echo ""
echo "📦 创建发布包..."
RELEASE_FILE="${RELEASE_DIR}/nxlinkWebTools_${TIMESTAMP}.tar.gz"
tar -czf "${RELEASE_FILE}" -C . "${BUILD_DIR}"

# 9. 清理构建目录（可选）
# rm -rf "${BUILD_DIR}"

echo ""
echo "✅ 打包完成！"
echo ""
echo "📦 发布包: ${RELEASE_FILE}"
echo "📁 构建目录: ${BUILD_DIR}"
echo ""
echo "部署说明："
echo "1. 将 ${RELEASE_FILE} 上传到服务器"
echo "2. 解压: tar -xzf $(basename ${RELEASE_FILE})"
echo "3. 进入目录: cd ${BUILD_DIR}"
echo "4. 按照 README.md 进行部署"
echo ""
