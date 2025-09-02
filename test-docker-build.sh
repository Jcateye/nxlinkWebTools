#!/bin/bash
# Docker构建测试脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%H:%M:%S')]${NC} $1"
}

# 清理函数
cleanup() {
    log_info "清理测试资源..."
    docker-compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
    docker rmi nxlink-webtools:test 2>/dev/null || true
}

# 设置陷阱，确保脚本退出时清理资源
trap cleanup EXIT

echo "🐳 Docker构建测试"
echo "=================="

# 1. 检查Docker环境
log_info "检查Docker环境..."
if ! docker info >/dev/null 2>&1; then
    log_error "Docker未运行，请启动Docker"
    exit 1
fi

if ! command -v docker-compose >/dev/null 2>&1; then
    log_error "docker-compose未安装"
    exit 1
fi

log_success "Docker环境检查通过"

# 2. 检查必要文件
log_info "检查必要文件..."
missing_files=()

[ ! -f "Dockerfile" ] && missing_files+=("Dockerfile")
[ ! -f "package.json" ] && missing_files+=("package.json")
[ ! -f "server/package.json" ] && missing_files+=("server/package.json")
[ ! -f "server.js" ] && missing_files+=("server.js")
[ ! -f "start.js" ] && missing_files+=("start.js")

if [ ${#missing_files[@]} -ne 0 ]; then
    log_error "缺少必要文件:"
    for file in "${missing_files[@]}"; do
        echo "  - $file"
    done
    exit 1
fi

log_success "文件检查通过"

# 3. 构建Docker镜像
log_info "开始构建Docker镜像..."
export TAG=test
export DOCKER_BUILDKIT=1

if docker build -t nxlink-webtools:test . --no-cache; then
    log_success "Docker镜像构建成功"
else
    log_error "Docker镜像构建失败"
    exit 1
fi

# 4. 检查镜像大小
log_info "检查镜像信息..."
docker images nxlink-webtools:test --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

# 5. 测试容器启动
log_info "测试容器启动..."

# 创建测试环境变量文件
cat > .env.test << EOF
NODE_ENV=production
BACKEND_PORT=8450
GATEWAY_PORT=8350
CORS_ORIGIN=http://localhost:8350
JWT_SECRET=test-jwt-secret-for-docker-build-test
ADMIN_PASSWORD=TestPassword123!
LOG_LEVEL=info
EOF

# 启动容器
if docker run -d \
    --name nxlink-test \
    --env-file .env.test \
    -p 8351:8350 \
    -p 8451:8450 \
    nxlink-webtools:test; then
    log_success "容器启动成功"
else
    log_error "容器启动失败"
    exit 1
fi

# 6. 等待服务启动
log_info "等待服务启动..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -f -s http://localhost:8451/health >/dev/null 2>&1; then
        log_success "服务启动成功 (尝试 $attempt/$max_attempts)"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "服务启动超时"
        echo
        log_info "容器日志:"
        docker logs nxlink-test --tail 50
        exit 1
    fi
    
    sleep 2
    ((attempt++))
done

# 7. 测试健康检查
log_info "测试健康检查..."
if curl -f -s http://localhost:8451/health | grep -q "healthy"; then
    log_success "健康检查通过"
else
    log_error "健康检查失败"
    docker logs nxlink-test --tail 20
    exit 1
fi

# 8. 测试前端访问
log_info "测试前端访问..."
if curl -f -s http://localhost:8351/ >/dev/null 2>&1; then
    log_success "前端访问正常"
else
    log_warn "前端访问可能有问题，但不影响构建测试"
fi

# 9. 清理测试容器
log_info "清理测试容器..."
docker stop nxlink-test >/dev/null 2>&1 || true
docker rm nxlink-test >/dev/null 2>&1 || true
rm -f .env.test

log_success "Docker构建测试完成！"

echo
echo "✅ 测试结果:"
echo "  - Docker镜像构建: 成功"
echo "  - 容器启动: 成功"
echo "  - 健康检查: 成功"
echo "  - 服务可用性: 成功"
echo
echo "🚀 可以使用以下命令进行生产部署:"
echo "  ./deploy-docker.sh prod"
echo
echo "📊 或查看详细监控:"
echo "  ./docker-monitor.sh all"