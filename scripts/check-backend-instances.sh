#!/bin/bash

# 后端实例健康检查脚本
# 用于排查nginx负载均衡问题

echo "🔍 开始检测后端实例健康状态..."
echo "================================================"

# 测试参数
API_PATH="/api/home/api/faqTenantLanguage"
AUTH_TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJ1SWQiOjg0MjgsImRldmljZVVuaXF1ZUlkZW50aWZpY2F0aW9uIjoiOTA1YjQ3NjAtNDkwNS0xMWVmLWJlNDEtOTc5MjkwYTA3YjY2IiwidXVJZCI6IjY4MmFkM2NlZTRiMGVmNWZmZjljYjM2OCJ9.dGL39mm3smTOz0-Uf8YDzHUWySwfVk1nFofVtisKNbc"

# 后端端口列表（根据实际情况调整）
BACKENDS=(
    "localhost:4000"
    "localhost:4001" 
    "localhost:4002"
    "localhost:8080"
    "localhost:8081"
    "localhost:8082"
)

# 检测单个后端实例
check_backend() {
    local backend=$1
    local url="http://${backend}${API_PATH}"
    local safe_name="${backend//:/_}"  # 将冒号替换为下划线
    
    echo -n "检测 $backend ... "
    
    # 发起请求并捕获响应
    response=$(curl -s -w "%{http_code}" -o "/tmp/response_${safe_name}.json" \
        -H "Accept: application/json, text/plain, */*" \
        -H "authorization: ${AUTH_TOKEN}" \
        -H "system_id: 5" \
        --connect-timeout 5 \
        --max-time 10 \
        "$url" 2>/dev/null)
    
    http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        # 检查响应内容
        if grep -q "NullPointerException\|系统内部异常" "/tmp/response_${safe_name}.json" 2>/dev/null; then
            echo "❌ NPE错误"
            echo "   响应: $(cat "/tmp/response_${safe_name}.json" | head -c 200)..."
        elif grep -q '"code":0' "/tmp/response_${safe_name}.json" 2>/dev/null; then
            echo "✅ 正常"
        else
            echo "⚠️  响应异常"
            echo "   响应: $(cat "/tmp/response_${safe_name}.json" | head -c 200)..."
        fi
    elif [ "$http_code" = "500" ]; then
        echo "❌ 服务器内部错误"
        echo "   响应: $(cat "/tmp/response_${safe_name}.json" | head -c 200)..."
    elif [ "$http_code" = "000" ]; then
        echo "🔌 连接失败（可能未启动）"
    else
        echo "⚠️  HTTP $http_code"
        echo "   响应: $(cat "/tmp/response_${safe_name}.json" | head -c 200)..."
    fi
    
    # 清理临时文件
    rm -f "/tmp/response_${safe_name}.json"
}

# 检测nginx代理
check_nginx() {
    echo -e "\n🌐 检测Nginx代理状态..."
    echo "================================================"
    
    local nginx_url="https://10.75.29.104${API_PATH}"
    
    for i in {1..10}; do
        echo -n "第${i}次请求 ... "
        
        response=$(curl -s -w "%{http_code}" -o /tmp/nginx_response_${i}.json \
            -H "Accept: application/json, text/plain, */*" \
            -H "authorization: ${AUTH_TOKEN}" \
            -H "system_id: 5" \
            --connect-timeout 5 \
            --max-time 10 \
            --insecure \
            "$nginx_url" 2>/dev/null)
        
        http_code="${response: -3}"
        
        if [ "$http_code" = "200" ]; then
            if grep -q "NullPointerException\|系统内部异常" /tmp/nginx_response_${i}.json 2>/dev/null; then
                echo "❌ NPE错误"
            elif grep -q '"code":0' /tmp/nginx_response_${i}.json 2>/dev/null; then
                echo "✅ 正常"
            else
                echo "⚠️  响应异常"
            fi
        elif [ "$http_code" = "500" ]; then
            echo "❌ 服务器内部错误"
        else
            echo "⚠️  HTTP $http_code"
        fi
        
        sleep 1
    done
    
    # 清理临时文件
    rm -f /tmp/nginx_response_*.json
}

# 检测端口占用
check_ports() {
    echo -e "\n🔌 检测端口占用情况..."
    echo "================================================"
    
    for backend in "${BACKENDS[@]}"; do
        port=${backend#*:}
        if lsof -i :$port >/dev/null 2>&1; then
            echo "✅ 端口 $port 已被占用"
            # 显示进程信息
            process_info=$(lsof -i :$port | tail -n 1 | awk '{print $2, $1}')
            echo "   进程: $process_info"
        else
            echo "❌ 端口 $port 未被占用"
        fi
    done
}

# 主函数
main() {
    echo "📊 系统信息:"
    echo "   时间: $(date)"
    echo "   主机: $(hostname)"
    echo "   用户: $(whoami)"
    echo ""
    
    # 检测端口占用
    check_ports
    
    echo -e "\n🏥 检测后端实例..."
    echo "================================================"
    
    # 检测各个后端实例
    for backend in "${BACKENDS[@]}"; do
        check_backend "$backend"
        sleep 0.5
    done
    
    # 检测nginx
    check_nginx
    
    echo -e "\n✨ 检测完成！"
    echo ""
    echo "💡 如果发现异常实例，建议:"
    echo "   1. 重启异常的后端实例"
    echo "   2. 检查nginx upstream配置"
    echo "   3. 临时从负载均衡中移除异常实例"
}

# 执行主函数
main "$@" 