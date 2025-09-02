#!/bin/bash

# NxLink WebTools Docker部署脚本
# 使用方法: ./deploy-docker.sh [环境] [标签]
# 环境: prod (生产), dev (开发), test (测试)
# 标签: Docker镜像标签, 默认为 latest

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 默认参数
ENVIRONMENT=${1:-prod}
TAG=${2:-latest}
COMPOSE_FILE=""

# 根据环境选择配置文件
case $ENVIRONMENT in
    "prod")
        COMPOSE_FILE="docker-compose.prod.yml"
        ENV_FILE=".env.production"
        ;;
    "dev")
        COMPOSE_FILE="docker-compose.yml"
        ENV_FILE=".env.development"
        ;;
    "test")
        COMPOSE_FILE="docker-compose.test.yml"
        ENV_FILE=".env.test"
        ;;
    *)
        log_error "无效的环境: $ENVIRONMENT"
        log_info "支持的环境: prod, dev, test"
        exit 1
        ;;
esac

# 检查必要的文件和目录
check_requirements() {
    log_info "检查部署要求..."

    # 检查Docker和docker-compose
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "docker-compose 未安装，请先安装 docker-compose"
        exit 1
    fi

    # 检查配置文件
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "找不到 compose 文件: $COMPOSE_FILE"
        exit 1
    fi

    # 检查环境配置文件
    if [ ! -f "$ENV_FILE" ]; then
        log_warn "环境配置文件不存在: $ENV_FILE"
        log_info "从模板创建配置文件..."
        if [ -f "env.production.template" ]; then
            cp env.production.template "$ENV_FILE"
            log_warn "已创建 $ENV_FILE，请编辑其中的配置值"
            log_info "编辑完成后重新运行此脚本"
            exit 1
        else
            log_warn "找不到环境配置模板文件，使用默认配置"
            # 创建基础配置文件
            cat > "$ENV_FILE" << EOF
NODE_ENV=production
BACKEND_PORT=8450
GATEWAY_PORT=8350
CORS_ORIGIN=http://localhost:8350
JWT_SECRET=please-change-this-jwt-secret-$(date +%s)
ADMIN_PASSWORD=ChangeMe123!
LOG_LEVEL=info
OPENAPI_ACCESS_KEY=
OPENAPI_ACCESS_SECRET=
OPENAPI_BIZ_TYPE=8
OPENAPI_BASE_URL=https://api-westus.nxlink.ai
EOF
            log_warn "已创建基础配置文件 $ENV_FILE，请根据需要修改"
        fi
    fi

    # 检查必要的目录
    mkdir -p logs uploads server/config ssl

    # 检查API密钥配置文件
    if [ ! -f "server/config/api-keys.json" ]; then
        log_warn "API密钥配置文件不存在: server/config/api-keys.json"
        log_info "创建基础配置文件..."
        cat > server/config/api-keys.json << EOF
{
  "version": "1.0.0",
  "lastUpdated": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "keys": []
}
EOF
        log_info "已创建基础API密钥配置文件，请根据需要添加密钥"
    fi

    log_success "部署要求检查完成"
}

# 构建Docker镜像
build_images() {
    log_info "构建Docker镜像 (标签: $TAG)..."

    # 设置构建参数
    export TAG=$TAG
    export DOCKER_BUILDKIT=1

    # 构建镜像
    if docker-compose -f "$COMPOSE_FILE" build --no-cache; then
        log_success "Docker镜像构建完成"
    else
        log_error "Docker镜像构建失败"
        exit 1
    fi
}

# 启动服务
start_services() {
    log_info "启动服务..."

    # 设置环境变量
    export TAG=$TAG

    # 启动服务
    if docker-compose -f "$COMPOSE_FILE" up -d; then
        log_success "服务启动完成"
    else
        log_error "服务启动失败"
        exit 1
    fi
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务启动..."

    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        log_info "检查服务状态 (尝试 $attempt/$max_attempts)..."

        # 检查应用健康状态
        if curl -f -s http://localhost:8350/health > /dev/null 2>&1; then
            log_success "应用服务已就绪"
            break
        fi

        sleep 10
        ((attempt++))
    done

    if [ $attempt -gt $max_attempts ]; then
        log_error "服务启动超时，请检查日志"
        log_info "查看应用日志: docker-compose -f $COMPOSE_FILE logs nxlink-app"
        exit 1
    fi
}

# 显示部署信息
show_deployment_info() {
    log_success "部署完成！"
    echo
    echo "========================================"
    echo "🚀 部署信息"
    echo "========================================"
    echo "🌐 前端地址: http://localhost:8350"
    echo "🔗 API地址: http://localhost:8350/api"
    echo "📊 健康检查: http://localhost:8350/health"
    echo "📝 日志目录: ./logs"
    echo "========================================"
    echo
    log_info "常用命令:"
    echo "  查看日志: docker-compose -f $COMPOSE_FILE logs -f"
    echo "  停止服务: docker-compose -f $COMPOSE_FILE down"
    echo "  重启服务: docker-compose -f $COMPOSE_FILE restart"
    echo "  更新部署: docker-compose -f $COMPOSE_FILE pull && docker-compose -f $COMPOSE_FILE up -d"
}

# 停止服务
stop_services() {
    log_info "停止现有服务..."
    docker-compose -f "$COMPOSE_FILE" down 2>/dev/null || true
}

# 清理资源
cleanup() {
    log_info "清理Docker资源..."
    docker system prune -f > /dev/null 2>&1 || true
    log_success "清理完成"
}

# 主函数
main() {
    echo
    echo "========================================"
    echo "🚀 NxLink WebTools Docker部署"
    echo "========================================"
    echo "环境: $ENVIRONMENT"
    echo "标签: $TAG"
    echo "配置文件: $COMPOSE_FILE"
    echo "========================================"
    echo

    # 检查要求
    check_requirements

    # 停止现有服务
    stop_services

    # 构建镜像
    build_images

    # 启动服务
    start_services

    # 等待服务就绪
    wait_for_services

    # 显示部署信息
    show_deployment_info

    # 可选清理
    read -p "是否清理未使用的Docker资源? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cleanup
    fi

    log_success "部署完成！🎉"
}

# 参数处理
case "${3:-}" in
    "build")
        check_requirements
        build_images
        ;;
    "start")
        check_requirements
        start_services
        wait_for_services
        show_deployment_info
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        export TAG=$TAG
        docker-compose -f "$COMPOSE_FILE" restart
        ;;
    "logs")
        docker-compose -f "$COMPOSE_FILE" logs -f
        ;;
    "cleanup")
        cleanup
        ;;
    "status")
        docker-compose -f "$COMPOSE_FILE" ps
        ;;
    *)
        main
        ;;
esac
