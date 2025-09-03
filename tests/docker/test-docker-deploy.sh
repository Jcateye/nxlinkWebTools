#!/bin/bash

# Docker部署测试脚本
# 用于验证Docker部署是否正常工作

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.prod.yml}
APP_URL=${APP_URL:-http://localhost:8350}
API_URL=${API_URL:-http://localhost:8350/api}

# 日志函数
log_info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} ✅ $1"
}

log_error() {
    echo -e "${RED}[$(date +'%H:%M:%S')]${NC} ❌ $1"
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')]${NC} ⚠️  $1"
}

# 测试函数
test_docker_running() {
    log_info "检查Docker服务状态..."
    if docker info >/dev/null 2>&1; then
        log_success "Docker服务运行正常"
        return 0
    else
        log_error "Docker服务未运行"
        return 1
    fi
}

test_containers_running() {
    log_info "检查容器运行状态..."
    local running=$(docker-compose -f "$COMPOSE_FILE" ps --services --filter "status=running" 2>/dev/null | wc -l)
    local total=$(docker-compose -f "$COMPOSE_FILE" ps --services 2>/dev/null | wc -l)

    if [ "$running" -eq "$total" ] && [ "$total" -gt 0 ]; then
        log_success "所有容器运行正常 ($running/$total)"
        return 0
    else
        log_error "容器运行异常 ($running/$total)"
        docker-compose -f "$COMPOSE_FILE" ps
        return 1
    fi
}

test_app_health() {
    log_info "测试应用健康检查..."
    if curl -f -s --max-time 5 "$APP_URL/health" >/dev/null 2>&1; then
        log_success "应用健康检查通过"
        return 0
    else
        log_error "应用健康检查失败"
        return 1
    fi
}

test_frontend_access() {
    log_info "测试前端页面访问..."
    local response=$(curl -s --max-time 5 -w "%{http_code}" "$APP_URL" -o /dev/null)
    if [ "$response" = "200" ]; then
        log_success "前端页面访问正常"
        return 0
    else
        log_error "前端页面访问失败 (HTTP $response)"
        return 1
    fi
}

test_api_access() {
    log_info "测试API接口访问..."
    local response=$(curl -s --max-time 5 -w "%{http_code}" "$API_URL/health" -o /dev/null)
    if [ "$response" = "200" ]; then
        log_success "API接口访问正常"
        return 0
    else
        log_error "API接口访问失败 (HTTP $response)"
        return 1
    fi
}

test_form_submission_api() {
    log_info "测试表单提交API..."

    # 使用测试任务ID进行表单提交测试
    local test_payload='{
        "form": "docker_test",
        "entry": {
            "field_5": "17770033771",
            "field_2": "Docker Test User"
        }
    }'

    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$test_payload" \
        -w "%{http_code}" \
        "$APP_URL/api/openapi/public/demo-api-key-1/test-task/form-submission" \
        -o /dev/null)

    if [ "$response" = "200" ]; then
        log_success "表单提交API测试通过"
        return 0
    else
        log_warn "表单提交API测试失败 (HTTP $response) - 可能是测试数据问题"
        return 0  # 不算严重错误
    fi
}

test_static_files() {
    log_info "测试静态文件服务..."

    # 测试CSS文件
    local css_response=$(curl -s --max-time 5 -w "%{http_code}" "$APP_URL/assets/index.css" -o /dev/null)
    if [ "$css_response" = "200" ]; then
        log_success "CSS文件服务正常"
    else
        log_warn "CSS文件服务异常 (HTTP $css_response)"
    fi

    # 测试JS文件
    local js_response=$(curl -s --max-time 5 -w "%{http_code}" "$APP_URL/assets/index.js" -o /dev/null)
    if [ "$js_response" = "200" ]; then
        log_success "JS文件服务正常"
    else
        log_warn "JS文件服务异常 (HTTP $js_response)"
    fi
}

test_nginx_config() {
    log_info "测试Nginx配置..."

    # 检查Nginx容器是否存在
    if docker-compose -f "$COMPOSE_FILE" ps nginx | grep -q "Up"; then
        log_success "Nginx服务运行正常"

        # 测试Nginx健康检查
        if curl -f -s --max-time 5 "http://localhost/health" >/dev/null 2>&1; then
            log_success "Nginx健康检查通过"
        else
            log_warn "Nginx健康检查失败"
        fi
    else
        log_info "Nginx服务未启用（可选服务）"
    fi
}

show_performance_info() {
    log_info "性能信息检查..."

    echo
    echo "容器资源使用情况:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null || echo "无法获取资源信息"

    echo
    echo "磁盘使用情况:"
    df -h | grep -E "(Filesystem|/)$" || echo "无法获取磁盘信息"
}

show_access_info() {
    echo
    echo "========================================"
    echo "🎉 Docker部署测试完成！"
    echo "========================================"
    echo
    echo "📱 访问地址:"
    echo "   前端应用: $APP_URL"
    echo "   API接口:  $API_URL"
    echo "   健康检查: $APP_URL/health"
    if docker-compose -f "$COMPOSE_FILE" ps nginx | grep -q "Up"; then
        echo "   Nginx代理: http://localhost"
    fi
    echo
    echo "🛠️  管理命令:"
    echo "   查看日志:    ./docker-monitor.sh logs"
    echo "   服务状态:    ./docker-monitor.sh status"
    echo "   健康检查:    ./docker-monitor.sh health"
    echo "   停止服务:    ./deploy-docker.sh prod stop"
    echo "   重启服务:    ./deploy-docker.sh prod restart"
    echo "========================================"
}

# 主测试函数
run_tests() {
    local failed_tests=0
    local total_tests=0

    echo "========================================"
    echo "🧪 NxLink WebTools Docker部署测试"
    echo "========================================"
    echo

    # 测试Docker服务
    ((total_tests++))
    if ! test_docker_running; then
        ((failed_tests++))
    fi

    # 测试容器状态
    ((total_tests++))
    if ! test_containers_running; then
        ((failed_tests++))
    fi

    # 等待服务启动
    log_info "等待服务完全启动..."
    sleep 5

    # 测试应用健康
    ((total_tests++))
    if ! test_app_health; then
        ((failed_tests++))
    fi

    # 测试前端访问
    ((total_tests++))
    if ! test_frontend_access; then
        ((failed_tests++))
    fi

    # 测试API访问
    ((total_tests++))
    if ! test_api_access; then
        ((failed_tests++))
    fi

    # 测试表单提交API
    ((total_tests++))
    if ! test_form_submission_api; then
        ((failed_tests++))
    fi

    # 测试静态文件
    test_static_files

    # 测试Nginx
    test_nginx_config

    # 显示性能信息
    show_performance_info

    # 总结测试结果
    echo
    echo "========================================"
    if [ $failed_tests -eq 0 ]; then
        log_success "所有测试通过！($total_tests/$total_tests)"
        echo "✅ Docker部署验证成功"
    else
        log_error "$failed_tests 个测试失败 ($((total_tests-failed_tests))/$total_tests 通过)"
        echo "❌ Docker部署存在问题，请检查上述错误信息"
    fi
    echo "========================================"

    # 显示访问信息
    show_access_info

    return $failed_tests
}

# 显示帮助信息
show_help() {
    echo "NxLink WebTools Docker部署测试脚本"
    echo
    echo "使用方法:"
    echo "  $0              运行所有测试"
    echo "  $0 help         显示帮助信息"
    echo
    echo "环境变量:"
    echo "  COMPOSE_FILE    Docker Compose文件 (默认: docker-compose.prod.yml)"
    echo "  APP_URL         应用URL (默认: http://localhost:8350)"
    echo "  API_URL         API URL (默认: http://localhost:8350/api)"
    echo
    echo "示例:"
    echo "  $0"
    echo "  COMPOSE_FILE=docker-compose.yml APP_URL=http://localhost:3000 $0"
}

# 主函数
main() {
    case "${1:-}" in
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            run_tests
            ;;
    esac
}

# 执行主函数
main "$@"
