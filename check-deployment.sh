#!/bin/bash
# 部署前配置检查脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 检查必要的文件
check_files() {
    log_info "检查必要文件..."
    
    local missing_files=()
    
    # 检查核心文件
    [ ! -f "package.json" ] && missing_files+=("package.json")
    [ ! -f "server.js" ] && missing_files+=("server.js")
    [ ! -f "start.js" ] && missing_files+=("start.js")
    [ ! -f "Dockerfile" ] && missing_files+=("Dockerfile")
    [ ! -f "docker-compose.prod.yml" ] && missing_files+=("docker-compose.prod.yml")
    
    # 检查后端文件
    [ ! -f "server/package.json" ] && missing_files+=("server/package.json")
    [ ! -d "server/src" ] && missing_files+=("server/src/")
    
    # 检查配置文件
    [ ! -f "env.production.template" ] && missing_files+=("env.production.template")
    
    if [ ${#missing_files[@]} -eq 0 ]; then
        log_success "所有必要文件存在"
        return 0
    else
        log_error "缺少以下文件:"
        for file in "${missing_files[@]}"; do
            echo "  - $file"
        done
        return 1
    fi
}

# 检查端口配置一致性
check_port_consistency() {
    log_info "检查端口配置一致性..."
    
    local issues=()
    
    # 检查server.js中的端口配置
    if grep -q "8300" server.js; then
        issues+=("server.js中仍使用旧端口8300，应改为8350")
    fi
    
    # 检查docker-compose文件中的端口
    if ! grep -q "8350:8350" docker-compose.prod.yml; then
        issues+=("docker-compose.prod.yml中网关端口配置可能不正确")
    fi
    
    if ! grep -q "8450:8450" docker-compose.prod.yml; then
        issues+=("docker-compose.prod.yml中后端端口配置可能不正确")
    fi
    
    if [ ${#issues[@]} -eq 0 ]; then
        log_success "端口配置一致"
        return 0
    else
        log_error "端口配置问题:"
        for issue in "${issues[@]}"; do
            echo "  - $issue"
        done
        return 1
    fi
}

# 检查环境变量配置
check_env_config() {
    log_info "检查环境变量配置..."
    
    local issues=()
    
    # 检查生产环境配置文件
    if [ -f ".env.production" ]; then
        # 检查关键配置项
        if ! grep -q "JWT_SECRET=" .env.production || grep -q "local-dev-jwt-secret" .env.production; then
            issues+=("JWT_SECRET未正确配置或仍使用开发环境默认值")
        fi
        
        if ! grep -q "ADMIN_PASSWORD=" .env.production || grep -q "ChangeMe123" .env.production; then
            issues+=("ADMIN_PASSWORD未正确配置或仍使用默认值")
        fi
        
        if grep -q "localhost" .env.production; then
            log_warn "CORS_ORIGIN中包含localhost，生产环境请使用实际域名"
        fi
    else
        issues+=("缺少.env.production文件，请从env.production.template复制并配置")
    fi
    
    if [ ${#issues[@]} -eq 0 ]; then
        log_success "环境变量配置正确"
        return 0
    else
        log_error "环境变量配置问题:"
        for issue in "${issues[@]}"; do
            echo "  - $issue"
        done
        return 1
    fi
}

# 检查依赖安装
check_dependencies() {
    log_info "检查依赖安装..."
    
    local issues=()
    
    # 检查Node.js版本
    if ! command -v node &> /dev/null; then
        issues+=("Node.js未安装")
    else
        local node_version=$(node --version | sed 's/v//')
        local major_version=$(echo $node_version | cut -d. -f1)
        if [ "$major_version" -lt 16 ]; then
            issues+=("Node.js版本过低($node_version)，需要16+")
        fi
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        issues+=("npm未安装")
    fi
    
    # 检查Docker（如果使用Docker部署）
    if [ "$1" = "docker" ]; then
        if ! command -v docker &> /dev/null; then
            issues+=("Docker未安装")
        fi
        
        if ! command -v docker-compose &> /dev/null; then
            issues+=("docker-compose未安装")
        fi
    fi
    
    if [ ${#issues[@]} -eq 0 ]; then
        log_success "依赖检查通过"
        return 0
    else
        log_error "依赖问题:"
        for issue in "${issues[@]}"; do
            echo "  - $issue"
        done
        return 1
    fi
}

# 检查构建配置
check_build_config() {
    log_info "检查构建配置..."
    
    local issues=()
    
    # 检查前端构建配置
    if ! grep -q '"build"' package.json; then
        issues+=("package.json中缺少build脚本")
    fi
    
    # 检查后端构建配置
    if [ -f "server/tsconfig.json" ]; then
        if ! grep -q '"build"' server/package.json; then
            issues+=("后端package.json中缺少build脚本")
        fi
    fi
    
    # 检查vite配置
    if [ -f "vite.config.ts" ]; then
        if ! grep -q "port: 3010" vite.config.ts; then
            log_warn "vite配置中的端口可能需要调整"
        fi
    fi
    
    if [ ${#issues[@]} -eq 0 ]; then
        log_success "构建配置正确"
        return 0
    else
        log_error "构建配置问题:"
        for issue in "${issues[@]}"; do
            echo "  - $issue"
        done
        return 1
    fi
}

# 生成部署建议
generate_suggestions() {
    log_info "生成部署建议..."
    
    echo
    echo "🚀 部署建议:"
    echo
    echo "1. 传统部署流程:"
    echo "   ./build.sh                    # 本地打包"
    echo "   scp releases/*.tar.gz server: # 上传到服务器"
    echo "   tar -xzf *.tar.gz            # 解压"
    echo "   ./deploy.sh                  # 部署"
    echo "   pm2 start ecosystem.config.js # 启动"
    echo
    echo "2. Docker部署流程:"
    echo "   ./deploy-docker.sh prod      # 一键部署"
    echo "   ./docker-monitor.sh status   # 检查状态"
    echo
    echo "3. 生产环境检查清单:"
    echo "   ✓ 配置.env.production文件"
    echo "   ✓ 修改JWT_SECRET和ADMIN_PASSWORD"
    echo "   ✓ 设置正确的CORS_ORIGIN域名"
    echo "   ✓ 确保防火墙开放8350端口"
    echo "   ✓ 配置Nginx反向代理（推荐）"
    echo "   ✓ 设置SSL证书（生产环境必须）"
    echo
}

# 主函数
main() {
    echo "🔍 nxlinkWebTools 部署配置检查"
    echo "=================================="
    echo
    
    local deployment_type=${1:-traditional}
    local failed_checks=0
    
    # 执行各项检查
    check_files || ((failed_checks++))
    echo
    
    check_port_consistency || ((failed_checks++))
    echo
    
    check_env_config || ((failed_checks++))
    echo
    
    check_dependencies "$deployment_type" || ((failed_checks++))
    echo
    
    check_build_config || ((failed_checks++))
    echo
    
    # 总结
    if [ $failed_checks -eq 0 ]; then
        log_success "所有检查通过！可以开始部署"
        generate_suggestions
        exit 0
    else
        log_error "发现 $failed_checks 个问题，请修复后重新检查"
        echo
        echo "修复问题后重新运行: $0 [$deployment_type]"
        exit 1
    fi
}

# 显示帮助
show_help() {
    echo "部署配置检查脚本"
    echo
    echo "用法: $0 [部署类型]"
    echo
    echo "部署类型:"
    echo "  traditional  传统部署（默认）"
    echo "  docker       Docker部署"
    echo
    echo "示例:"
    echo "  $0                # 检查传统部署配置"
    echo "  $0 docker         # 检查Docker部署配置"
}

# 参数处理
case "${1:-}" in
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        main "$@"
        ;;
esac