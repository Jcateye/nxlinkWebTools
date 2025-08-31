#!/bin/bash

# NxLink WebTools Docker监控脚本
# 用于监控容器状态、健康检查和日志分析

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.prod.yml}
APP_URL=${APP_URL:-http://localhost:8350}
API_URL=${API_URL:-http://localhost:8350/api}

# 日志函数
log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_header() {
    echo -e "${PURPLE}=======================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}=======================================${NC}"
}

# 检查Docker服务状态
check_docker_status() {
    log_header "Docker服务状态检查"

    if ! docker info >/dev/null 2>&1; then
        log_error "Docker服务未运行"
        return 1
    fi

    log_success "Docker服务运行正常"
    return 0
}

# 检查容器状态
check_containers() {
    log_header "容器状态检查"

    local containers=$(docker-compose -f "$COMPOSE_FILE" ps --services --filter "status=running" 2>/dev/null | wc -l)
    local total_containers=$(docker-compose -f "$COMPOSE_FILE" ps --services 2>/dev/null | wc -l)

    if [ "$containers" -eq "$total_containers" ] && [ "$total_containers" -gt 0 ]; then
        log_success "所有容器运行正常 ($containers/$total_containers)"

        echo
        docker-compose -f "$COMPOSE_FILE" ps
        return 0
    else
        log_error "部分容器未运行 ($containers/$total_containers)"

        echo
        docker-compose -f "$COMPOSE_FILE" ps
        return 1
    fi
}

# 健康检查
health_check() {
    log_header "应用健康检查"

    local failed_checks=0

    # 检查应用健康端点
    if curl -f -s --max-time 10 "$APP_URL/health" >/dev/null 2>&1; then
        log_success "应用健康检查: ✅ 通过"
    else
        log_error "应用健康检查: ❌ 失败"
        ((failed_checks++))
    fi

    # 检查API端点
    if curl -f -s --max-time 10 "$API_URL/health" >/dev/null 2>&1; then
        log_success "API健康检查: ✅ 通过"
    else
        log_error "API健康检查: ❌ 失败"
        ((failed_checks++))
    fi

    # 检查前端页面
    if curl -f -s --max-time 10 "$APP_URL" >/dev/null 2>&1; then
        log_success "前端页面检查: ✅ 通过"
    else
        log_error "前端页面检查: ❌ 失败"
        ((failed_checks++))
    fi

    if [ $failed_checks -eq 0 ]; then
        log_success "所有健康检查通过"
        return 0
    else
        log_error "$failed_checks 个健康检查失败"
        return 1
    fi
}

# 检查资源使用情况
check_resources() {
    log_header "资源使用情况"

    echo "Docker容器资源使用:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

    echo
    echo "磁盘使用情况:"
    df -h | grep -E "(Filesystem|/$)"

    echo
    echo "Docker系统信息:"
    docker system df
}

# 检查日志
check_logs() {
    local lines=${1:-50}
    local service=${2:-nxlink-app}

    log_header "最近 $lines 行日志 ($service)"

    docker-compose -f "$COMPOSE_FILE" logs --tail="$lines" "$service"
}

# 分析错误日志
analyze_errors() {
    log_header "错误日志分析"

    local since=${1:-1h}

    echo "最近 $since 的错误日志:"

    # 应用错误
    echo
    echo "应用错误:"
    docker-compose -f "$COMPOSE_FILE" logs --since="$since" nxlink-app 2>&1 | grep -i error | head -10 || echo "无错误日志"

    # Nginx错误
    echo
    echo "Nginx错误:"
    docker-compose -f "$COMPOSE_FILE" logs --since="$since" nginx 2>&1 | grep -i error | head -10 || echo "无错误日志"
}

# 重启服务
restart_service() {
    local service=${1:-all}

    log_header "重启服务"

    if [ "$service" = "all" ]; then
        log_info "重启所有服务..."
        docker-compose -f "$COMPOSE_FILE" restart
    else
        log_info "重启服务: $service"
        docker-compose -f "$COMPOSE_FILE" restart "$service"
    fi

    sleep 5
    check_containers
}

# 备份数据
backup_data() {
    local backup_dir="backup-$(date +%Y%m%d-%H%M%S)"

    log_header "数据备份"

    log_info "创建备份目录: $backup_dir"
    mkdir -p "$backup_dir"

    # 备份配置文件
    log_info "备份配置文件..."
    cp -r server/config "$backup_dir/" 2>/dev/null || log_warn "配置文件备份失败"
    cp .env* "$backup_dir/" 2>/dev/null || log_warn "环境文件备份失败"

    # 备份日志
    log_info "备份日志..."
    cp -r logs "$backup_dir/" 2>/dev/null || log_warn "日志备份失败"

    # 备份上传文件
    log_info "备份上传文件..."
    cp -r uploads "$backup_dir/" 2>/dev/null || log_warn "上传文件备份失败"

    # 创建压缩包
    log_info "创建压缩包..."
    tar -czf "${backup_dir}.tar.gz" "$backup_dir"

    # 清理临时目录
    rm -rf "$backup_dir"

    log_success "备份完成: ${backup_dir}.tar.gz"
}

# 显示帮助信息
show_help() {
    echo "NxLink WebTools Docker监控脚本"
    echo
    echo "使用方法:"
    echo "  $0 [命令] [参数]"
    echo
    echo "命令:"
    echo "  status          显示服务状态"
    echo "  health          执行健康检查"
    echo "  resources       显示资源使用情况"
    echo "  logs [行数] [服务] 查看日志"
    echo "  errors [时间]   分析错误日志"
    echo "  restart [服务]  重启服务"
    echo "  backup          备份数据"
    echo "  all             执行所有检查"
    echo "  help            显示此帮助"
    echo
    echo "示例:"
    echo "  $0 status"
    echo "  $0 logs 100 nginx"
    echo "  $0 errors 2h"
    echo "  $0 restart nxlink-app"
}

# 主函数
main() {
    case "${1:-all}" in
        "status")
            check_docker_status && check_containers
            ;;
        "health")
            health_check
            ;;
        "resources")
            check_resources
            ;;
        "logs")
            check_logs "${2:-50}" "${3:-nxlink-app}"
            ;;
        "errors")
            analyze_errors "${2:-1h}"
            ;;
        "restart")
            restart_service "${2:-all}"
            ;;
        "backup")
            backup_data
            ;;
        "all")
            check_docker_status
            check_containers
            echo
            health_check
            echo
            check_resources
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            echo
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
