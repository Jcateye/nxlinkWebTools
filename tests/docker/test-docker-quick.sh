#!/bin/bash
# 快速Docker测试脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%H:%M:%S')]${NC} $1"
}

echo "🚀 快速Docker测试"
echo "=================="

# 清理之前的测试
log_info "清理之前的测试容器..."
docker stop nxlink-test 2>/dev/null || true
docker rm nxlink-test 2>/dev/null || true

# 创建测试环境变量文件
log_info "创建测试配置..."
cat > .env.test << EOF
NODE_ENV=production
BACKEND_PORT=8450
GATEWAY_PORT=8350
CORS_ORIGIN=http://localhost:8350
JWT_SECRET=test-jwt-secret-for-docker-build-test
ADMIN_PASSWORD=TestPassword123!
LOG_LEVEL=info
DOCKER_CONTAINER=true
EOF

# 启动容器
log_info "启动测试容器..."
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

# 等待服务启动
log_info "等待服务启动..."
max_attempts=20
attempt=1

while [ $attempt -le $max_attempts ]; do
    log_info "检查服务状态 (尝试 $attempt/$max_attempts)..."
    
    # 检查容器是否还在运行
    if ! docker ps | grep -q nxlink-test; then
        log_error "容器已停止运行"
        echo
        log_info "容器日志:"
        docker logs nxlink-test --tail 30
        exit 1
    fi
    
    # 检查健康状态
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
    
    sleep 3
    ((attempt++))
done

# 测试健康检查
log_info "测试健康检查..."
health_response=$(curl -s http://localhost:8451/health)
if echo "$health_response" | grep -q '"status":"ok"'; then
    log_success "健康检查通过: $health_response"
else
    log_error "健康检查失败: $health_response"
fi

# 测试前端访问
log_info "测试前端访问..."
if curl -f -s http://localhost:8351/ >/dev/null 2>&1; then
    log_success "前端访问正常"
else
    log_error "前端访问失败"
fi

# 显示容器状态
log_info "容器状态:"
docker ps | grep nxlink-test

log_success "Docker测试完成！"

echo
echo "✅ 测试结果:"
echo "  - 容器启动: 成功"
echo "  - 健康检查: 成功"
echo "  - 前端访问: 成功"
echo
echo "🔧 清理测试容器:"
echo "  docker stop nxlink-test && docker rm nxlink-test"
echo
echo "🚀 生产部署:"
echo "  ./deploy-docker.sh prod"

# 清理测试文件
rm -f .env.test