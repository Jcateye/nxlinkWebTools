#!/bin/bash
# 测试环境变量加载

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

echo "🔧 环境变量加载测试"
echo "==================="

# 1. 检查配置文件是否存在
log_info "检查配置文件..."

config_files=(".env.production" "production.env" ".env")
found_config=""

for file in "${config_files[@]}"; do
    if [ -f "$file" ]; then
        log_success "找到配置文件: $file"
        found_config="$file"
        break
    fi
done

if [ -z "$found_config" ]; then
    log_error "未找到任何配置文件"
    log_info "创建测试配置文件..."
    
    cat > .env.production << EOF
NODE_ENV=production
PORT=8450
BACKEND_PORT=8450
CORS_ORIGIN=http://localhost:8350
JWT_SECRET=test-jwt-secret-$(date +%s)
ADMIN_PASSWORD=TestPassword123!
LOG_LEVEL=info
TEST_VAR=production_test_value
EOF
    
    found_config=".env.production"
    log_success "已创建测试配置文件: $found_config"
fi

# 2. 显示配置文件内容（隐藏敏感信息）
log_info "配置文件内容预览:"
echo "----------------------------------------"
cat "$found_config" | sed 's/\(SECRET\|PASSWORD\)=.*/\1=***HIDDEN***/' | head -10
echo "----------------------------------------"

# 3. 测试start.js是否能正确加载环境变量
log_info "测试start.js环境变量加载..."

# 创建临时测试脚本
cat > test_env_script.js << 'EOF'
// 模拟start.js的环境变量加载逻辑
const fs = require('fs');

function loadEnvConfig(env) {
  const envFiles = [
    `.env.${env}`,
    'production.env',
    '.env'
  ];

  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      console.log(`🔧 加载环境配置: ${envFile}`);
      
      const envContent = fs.readFileSync(envFile, 'utf8');
      const envVars = {};
      
      envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#') && line.includes('=')) {
          const [key, ...valueParts] = line.split('=');
          const value = valueParts.join('=').trim();
          envVars[key.trim()] = value;
        }
      });
      
      Object.keys(envVars).forEach(key => {
        if (!process.env[key]) {
          process.env[key] = envVars[key];
        }
      });
      
      console.log(`✅ 已加载 ${Object.keys(envVars).length} 个环境变量`);
      return true;
    }
  }
  
  console.log(`⚠️  未找到环境配置文件`);
  return false;
}

// 测试加载
console.log('测试环境变量加载...');
loadEnvConfig('production');

// 显示关键环境变量
console.log('\n关键环境变量:');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`PORT: ${process.env.PORT}`);
console.log(`BACKEND_PORT: ${process.env.BACKEND_PORT}`);
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '***SET***' : 'NOT SET'}`);
console.log(`ADMIN_PASSWORD: ${process.env.ADMIN_PASSWORD ? '***SET***' : 'NOT SET'}`);
console.log(`TEST_VAR: ${process.env.TEST_VAR}`);
EOF

# 运行测试
node test_env_script.js

# 4. 测试后端环境变量加载
log_info "测试后端环境变量加载..."

if [ -f "server/src/index.ts" ]; then
    log_info "检查后端TypeScript配置..."
    
    # 检查后端是否有正确的环境变量加载代码
    if grep -q "dotenv.config" server/src/index.ts; then
        log_success "后端有dotenv配置"
    else
        log_error "后端缺少dotenv配置"
    fi
    
    # 检查是否有环境文件路径配置
    if grep -q "\.env\." server/src/index.ts; then
        log_success "后端有环境文件路径配置"
    else
        log_error "后端缺少环境文件路径配置"
    fi
else
    log_error "未找到后端源码文件"
fi

# 5. 建议修复方案
echo
log_info "修复建议:"
echo "1. 确保配置文件存在: .env.production 或 production.env"
echo "2. 运行生产环境: npm run start:prod"
echo "3. 检查环境变量是否生效: 查看启动日志中的配置加载信息"
echo "4. 如果仍有问题，检查后端代码中的dotenv配置"

# 清理临时文件
rm -f test_env_script.js

log_success "环境变量测试完成！"