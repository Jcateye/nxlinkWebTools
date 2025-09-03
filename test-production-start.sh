#!/bin/bash
# 测试生产环境启动

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🚀 生产环境启动测试"
echo "==================="

# 1. 检查配置文件
log_info "检查生产环境配置..."

if [ ! -f ".env.production" ] && [ ! -f "production.env" ]; then
    log_error "未找到生产环境配置文件"
    log_info "创建基础配置文件..."
    
    cat > .env.production << EOF
NODE_ENV=production
PORT=8450
BACKEND_PORT=8450
GATEWAY_PORT=8350
CORS_ORIGIN=http://localhost:8350
JWT_SECRET=production-jwt-secret-$(date +%s)
ADMIN_PASSWORD=ProductionPassword123!
LOG_LEVEL=info
OPENAPI_ACCESS_KEY=
OPENAPI_ACCESS_SECRET=
OPENAPI_BIZ_TYPE=8
OPENAPI_BASE_URL=https://api-westus.nxlink.ai
EOF
    
    log_success "已创建 .env.production 配置文件"
fi

# 2. 检查必要的依赖
log_info "检查项目依赖..."

if [ ! -d "node_modules" ]; then
    log_info "安装前端依赖..."
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    log_info "安装后端依赖..."
    cd server && npm install && cd ..
fi

# 3. 构建项目（如果需要）
log_info "检查构建状态..."

if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    log_info "构建前端项目..."
    npm run build
fi

if [ ! -d "server/dist" ] || [ ! -f "server/dist/index.js" ]; then
    log_info "构建后端项目..."
    cd server && npm run build && cd ..
fi

# 4. 测试启动脚本（短时间运行）
log_info "测试启动脚本..."

# 创建测试启动脚本
cat > test_start.js << 'EOF'
// 测试启动脚本，验证环境变量加载
const { spawn } = require('child_process');

console.log('🧪 测试生产环境启动...');

// 启动服务
const child = spawn('node', ['start.js', 'prod'], {
    stdio: 'pipe',
    env: process.env
});

let output = '';
let hasEnvLoading = false;
let hasServiceStart = false;

child.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    console.log(text.trim());
    
    // 检查环境变量加载
    if (text.includes('加载环境配置')) {
        hasEnvLoading = true;
    }
    
    // 检查服务启动
    if (text.includes('将启动服务') || text.includes('正在启动')) {
        hasServiceStart = true;
    }
});

child.stderr.on('data', (data) => {
    const text = data.toString();
    console.error(text.trim());
});

// 10秒后停止测试
setTimeout(() => {
    child.kill('SIGTERM');
    
    console.log('\n📊 测试结果:');
    console.log(`✅ 环境变量加载: ${hasEnvLoading ? '成功' : '失败'}`);
    console.log(`✅ 服务启动: ${hasServiceStart ? '成功' : '失败'}`);
    
    if (hasEnvLoading && hasServiceStart) {
        console.log('\n🎉 生产环境启动测试通过！');
        process.exit(0);
    } else {
        console.log('\n❌ 生产环境启动测试失败！');
        process.exit(1);
    }
}, 10000);

child.on('error', (error) => {
    console.error('启动错误:', error.message);
    process.exit(1);
});
EOF

# 运行测试
node test_start.js

# 清理
rm -f test_start.js

log_success "生产环境启动测试完成！"