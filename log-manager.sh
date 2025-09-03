#!/bin/bash
# 日志管理脚本
# 功能：检查日志文件大小，超过限制时自动轮转，清理老日志

set -e

# 配置参数
LOG_DIR="./logs"
MAX_SIZE_MB=${MAX_SIZE_MB:-10}  # 默认10MB
MAX_BACKUP_FILES=${MAX_BACKUP_FILES:-5}  # 保留的最大备份文件数
ROTATE_SUFFIX=".old"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

# 检查日志目录是否存在
check_log_dir() {
    if [ ! -d "$LOG_DIR" ]; then
        log_info "日志目录不存在，创建: $LOG_DIR"
        mkdir -p "$LOG_DIR"
        return 0
    fi
}

# 获取文件大小（MB）
get_file_size_mb() {
    local file="$1"
    if [ -f "$file" ]; then
        # macOS和Linux兼容的方式获取文件大小
        if command -v stat >/dev/null 2>&1; then
            # Linux
            stat -f%z "$file" 2>/dev/null | awk '{print $1/1024/1024}' || echo "0"
        elif command -v gstat >/dev/null 2>&1; then
            # macOS with coreutils
            gstat -f%z "$file" 2>/dev/null | awk '{print $1/1024/1024}' || echo "0"
        else
            # Fallback: use ls
            ls -l "$file" 2>/dev/null | awk '{print $5/1024/1024}' || echo "0"
        fi
    else
        echo "0"
    fi
}

# 轮转日志文件
rotate_log_file() {
    local file="$1"
    local base_name=$(basename "$file")
    local dir_name=$(dirname "$file")
    local timestamp=$(date '+%Y%m%d_%H%M%S')

    # 生成新的备份文件名
    local backup_file="${dir_name}/${base_name}.${timestamp}${ROTATE_SUFFIX}"

    # 移动文件
    if mv "$file" "$backup_file" 2>/dev/null; then
        log_success "已轮转日志文件: $base_name -> $(basename "$backup_file")"
        return 0
    else
        log_error "轮转日志文件失败: $base_name"
        return 1
    fi
}

# 清理旧的备份文件
cleanup_old_backups() {
    local file_pattern="$1"

    # 查找所有匹配的备份文件，按修改时间排序（最新的在前）
    local backup_files=($(find "$LOG_DIR" -name "${file_pattern}*" -type f 2>/dev/null | xargs ls -t 2>/dev/null || true))

    # 如果备份文件数量超过限制，删除最老的
    local file_count=${#backup_files[@]}
    if [ $file_count -gt $MAX_BACKUP_FILES ]; then
        local files_to_delete=$((file_count - MAX_BACKUP_FILES))
        log_info "发现 $file_count 个备份文件，删除最老的 $files_to_delete 个"

        for ((i=MAX_BACKUP_FILES; i<file_count; i++)); do
            if rm -f "${backup_files[$i]}" 2>/dev/null; then
                log_success "已删除旧备份: $(basename "${backup_files[$i]}")"
            fi
        done
    fi
}

# 处理单个日志文件
process_log_file() {
    local file="$1"
    local base_name=$(basename "$file")

    if [ ! -f "$file" ]; then
        return 0
    fi

    local size_mb=$(get_file_size_mb "$file")

    # 比较大小（使用awk进行浮点比较）
    local is_large=$(echo "$size_mb > $MAX_SIZE_MB" | bc -l 2>/dev/null || echo "0")

    if [ "$is_large" = "1" ]; then
        log_warning "日志文件过大: $base_name (${size_mb}MB > ${MAX_SIZE_MB}MB)"
        rotate_log_file "$file"
        cleanup_old_backups "$base_name"
    else
        log_info "日志文件正常: $base_name (${size_mb}MB)"
    fi
}

# 显示日志统计信息
show_log_stats() {
    log_info "=== 日志统计信息 ==="

    if [ ! -d "$LOG_DIR" ]; then
        log_warning "日志目录不存在: $LOG_DIR"
        return
    fi

    local total_size=0
    local file_count=0

    echo "日志文件列表:"
    echo "------------------------------------------------------------"

    for file in "$LOG_DIR"/*.log; do
        if [ -f "$file" ]; then
            local size_mb=$(get_file_size_mb "$file")
            local size_kb=$(echo "$size_mb * 1024" | bc -l 2>/dev/null || echo "0")
            local size_display

            if (( $(echo "$size_mb >= 1" | bc -l 2>/dev/null || echo "0") )); then
                size_display="${size_mb}MB"
            else
                size_display="${size_kb}KB"
            fi

            echo "$(basename "$file") - $size_display"
            total_size=$(echo "$total_size + $size_mb" | bc -l 2>/dev/null || echo "$total_size")
            ((file_count++))
        fi
    done

    echo "------------------------------------------------------------"
    echo "总文件数: $file_count"
    echo "总大小: ${total_size}MB"
    echo ""
}

# 显示使用帮助
show_help() {
    echo "日志管理脚本使用方法:"
    echo ""
    echo "基本用法:"
    echo "  $0                    # 检查并处理所有日志文件"
    echo "  $0 --stats           # 显示日志统计信息"
    echo "  $0 --clean           # 清理所有日志文件"
    echo "  $0 --help            # 显示此帮助信息"
    echo ""
    echo "环境变量:"
    echo "  MAX_SIZE_MB          # 最大文件大小(MB)，默认: $MAX_SIZE_MB"
    echo "  MAX_BACKUP_FILES     # 保留的最大备份文件数，默认: $MAX_BACKUP_FILES"
    echo ""
    echo "示例:"
    echo "  MAX_SIZE_MB=5 $0     # 设置最大文件大小为5MB"
    echo "  $0 --stats           # 查看日志统计"
    echo ""
}

# 清理所有日志文件
clean_all_logs() {
    log_warning "即将删除所有日志文件！"
    read -p "确定要继续吗? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if rm -rf "$LOG_DIR"/* 2>/dev/null; then
            log_success "已删除所有日志文件"
        else
            log_error "删除日志文件失败"
        fi
    else
        log_info "操作已取消"
    fi
}

# 主函数
main() {
    check_log_dir

    case "${1:-}" in
        --help|-h)
            show_help
            ;;
        --stats|-s)
            show_log_stats
            ;;
        --clean|-c)
            clean_all_logs
            ;;
        *)
            # 默认操作：检查和处理日志文件
            log_info "开始检查日志文件..."
            log_info "最大文件大小: ${MAX_SIZE_MB}MB"
            log_info "最大备份文件数: ${MAX_BACKUP_FILES}"

            # 处理所有日志文件
            for file in "$LOG_DIR"/*.log; do
                if [ -f "$file" ]; then
                    process_log_file "$file"
                fi
            done

            # 处理按日期轮转的日志文件
            for file in "$LOG_DIR"/*.log.*; do
                if [ -f "$file" ]; then
                    process_log_file "$file"
                fi
            done

            log_success "日志检查完成"
            show_log_stats
            ;;
    esac
}

# 运行主函数
main "$@"
