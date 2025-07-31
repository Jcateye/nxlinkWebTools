#!/bin/bash

echo "🚀 启动LLM测试系统后端服务"
echo "============================"

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 请先安装Node.js"
    exit 1
fi

echo "✅ Node.js版本: $(node -v)"

# 进入server目录
cd server

# 检查是否有express和cors依赖
if [ ! -d "node_modules" ] || [ ! -d "node_modules/express" ] || [ ! -d "node_modules/cors" ]; then
    echo "📦 安装依赖包..."
    
    # 使用简化的package.json
    if [ -f "simple-package.json" ]; then
        cp simple-package.json package.json
        echo "📄 使用简化配置文件"
    fi
    
    npm install
    
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
    
    echo "✅ 依赖安装完成"
fi

# 检查端口是否被占用
if lsof -Pi :8001 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  警告: 端口8001已被占用"
    echo "请先停止占用端口的进程，或修改环境变量PORT"
    
    # 显示占用端口的进程
    echo "占用端口8001的进程:"
    lsof -Pi :8001 -sTCP:LISTEN
    
    read -p "是否要强制杀死占用进程? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti:8001 | xargs kill -9
        echo "✅ 已强制停止占用进程"
    else
        echo "❌ 启动取消"
        exit 1
    fi
fi

# 启动服务器
echo "🚀 启动后端服务..."
echo ""

# 设置环境变量
export NODE_ENV=development
export PORT=8001

node simple-server.js 