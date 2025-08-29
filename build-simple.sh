#!/bin/bash
# nxlinkWebTools 简化的生产环境打包脚本

set -e  # 遇到错误立即退出

echo "🚀 开始打包 nxlinkWebTools (简化版)..."
echo ""

# 定义变量
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BUILD_DIR="build_${TIMESTAMP}"
RELEASE_DIR="releases"

# 创建构建目录
echo "📁 创建构建目录: ${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"
mkdir -p "${RELEASE_DIR}"

# 1. 构建前端
echo ""
echo "🎨 构建前端项目..."
npm run build

# 2. 准备打包文件
echo ""
echo "📋 准备打包文件..."

# 复制必要文件到构建目录
cp -r dist "${BUILD_DIR}/"                    # 前端构建产物
cp -r server "${BUILD_DIR}/"                  # 整个后端目录（包含源码）
cp -r config "${BUILD_DIR}/"                  # 项目配置
cp server.js "${BUILD_DIR}/"                  # 生产服务器
cp start.js "${BUILD_DIR}/"                    # 启动脚本
cp package.json "${BUILD_DIR}/"               
cp package-lock.json "${BUILD_DIR}/"          
cp ecosystem.config.js "${BUILD_DIR}/"        # PM2配置

# 删除不需要的文件
rm -rf "${BUILD_DIR}/server/node_modules"
rm -rf "${BUILD_DIR}/server/dist"
rm -rf "${BUILD_DIR}/server/logs"
rm -rf "${BUILD_DIR}/server/database.db"

# 3. 创建生产环境配置模板
echo ""
echo "📝 创建配置文件模板..."
cp config/production.env.example "${BUILD_DIR}/"

# 4. 创建部署脚本
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
cd server
npm install
cd ..

# 4. 设置权限
chmod +x start.js
chmod +x deploy.sh

echo ""
echo "✅ 部署准备完成！"
echo ""
echo "启动服务："
echo "  使用PM2: pm2 start ecosystem.config.js"
echo "  或使用启动脚本: ./start.js prod"
echo ""
EOF

chmod +x "${BUILD_DIR}/deploy.sh"

# 5. 创建 README
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
   
   使用PM2（推荐）:
   \`\`\`bash
   pm2 start ecosystem.config.js
   \`\`\`
   
   或使用启动脚本:
   \`\`\`bash
   ./start.js prod
   \`\`\`

## 服务端口

- 网关服务: 8350
- 后端服务: 8450

## 注意事项

- 后端使用 ts-node 直接运行 TypeScript 代码
- 确保服务器已安装 Node.js 16+
- 建议使用 PM2 管理进程
EOF

# 6. 创建压缩包
echo ""
echo "📦 创建发布包..."
RELEASE_FILE="${RELEASE_DIR}/nxlinkWebTools_${TIMESTAMP}.tar.gz"
tar -czf "${RELEASE_FILE}" -C . "${BUILD_DIR}"

# 7. 清理构建目录（可选）
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
