#!/bin/bash

echo "🚀 LLM测试系统后端服务快速设置脚本"
echo "=================================="

# 检查Node.js版本
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 请先安装Node.js (版本 >= 16)"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ 错误: Node.js版本过低，请升级到16+版本"
    exit 1
fi

echo "✅ Node.js版本检查通过: $(node -v)"

# 检查MySQL
if ! command -v mysql &> /dev/null; then
    echo "❌ 错误: 请先安装MySQL数据库"
    exit 1
fi

echo "✅ MySQL检查通过"

# 安装依赖
echo "📦 安装依赖包..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✅ 依赖安装完成"

# 创建环境变量文件
if [ ! -f ".env" ]; then
    echo "⚙️ 创建环境变量文件..."
    cp env.example .env
    echo "✅ 已创建.env文件，请编辑数据库连接信息"
    
    # 提示用户编辑数据库配置
    echo ""
    echo "📝 请编辑 .env 文件中的数据库配置:"
    echo "   DATABASE_URL=\"mysql://root:your_password@localhost:3306/llm_test_db\""
    echo ""
    read -p "按回车键继续..."
else
    echo "✅ .env文件已存在"
fi

# 创建数据库
echo "🗄️ 设置数据库..."
read -p "请输入MySQL root密码: " -s MYSQL_PASSWORD
echo ""

mysql -u root -p$MYSQL_PASSWORD -e "CREATE DATABASE IF NOT EXISTS llm_test_db;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ 数据库创建成功"
else
    echo "⚠️ 数据库可能已存在或密码错误"
fi

# 生成Prisma客户端
echo "🔧 生成Prisma客户端..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ Prisma客户端生成失败"
    exit 1
fi

echo "✅ Prisma客户端生成完成"

# 推送数据库结构
echo "📊 推送数据库结构..."
npx prisma db push

if [ $? -ne 0 ]; then
    echo "❌ 数据库结构推送失败，请检查数据库连接"
    exit 1
fi

echo "✅ 数据库结构推送完成"

# 创建日志目录
mkdir -p logs
echo "✅ 日志目录创建完成"

echo ""
echo "🎉 设置完成！"
echo ""
echo "📋 下一步操作:"
echo "   1. 检查并编辑 .env 文件中的配置"
echo "   2. 运行 'npm run dev' 启动开发服务器"
echo "   3. 运行 'npm run db:studio' 打开数据库管理界面"
echo ""
echo "🌐 服务地址:"
echo "   - API服务: http://localhost:8001"
echo "   - API文档: http://localhost:8001/api-docs"
echo "   - 健康检查: http://localhost:8001/health"
echo ""
echo "📖 更多信息请查看 README.md 文件" 