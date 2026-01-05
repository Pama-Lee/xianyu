#!/bin/bash
# 本地开发环境启动脚本（支持热重载）

set -e

echo "🚀 启动本地开发环境..."

# 检查 Python 环境
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到 python3，请先安装 Python 3.11+"
    exit 1
fi

# 检查 Node.js 环境
if ! command -v node &> /dev/null; then
    echo "❌ 未找到 node，请先安装 Node.js"
    exit 1
fi

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
    echo "⚠️  未找到 pnpm，尝试使用 npm..."
    PACKAGE_MANAGER="npm"
else
    PACKAGE_MANAGER="pnpm"
fi

# 检查 Python 依赖
if [ ! -d "venv" ]; then
    echo "📦 创建 Python 虚拟环境..."
    python3 -m venv venv
fi

echo "📦 激活虚拟环境并安装 Python 依赖..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 检查前端依赖
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 安装前端依赖..."
    cd frontend
    $PACKAGE_MANAGER install
    cd ..
fi

# 创建日志目录
mkdir -p logs

echo ""
echo "✅ 环境准备完成！"
echo ""
echo "📝 启动说明："
echo "   - 后端服务: http://localhost:8080"
echo "   - 前端服务: http://localhost:3000"
echo "   - 访问前端即可，前端会自动代理 API 请求到后端"
echo ""
echo "🔄 热重载已启用："
echo "   - 修改 Python 文件后，后端会自动重启"
echo "   - 修改前端文件后，浏览器会自动刷新"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# 使用 concurrently 同时启动前后端（如果安装了）
if command -v concurrently &> /dev/null; then
    echo "🚀 使用 concurrently 启动前后端..."
    concurrently \
        --names "后端,前端" \
        --prefix-colors "blue,green" \
        "python3 dev_server.py" \
        "cd frontend && $PACKAGE_MANAGER run dev"
else
    echo "⚠️  未安装 concurrently，将分别启动前后端"
    echo "   建议安装: npm install -g concurrently"
    echo ""
    echo "🚀 启动后端服务..."
    python3 dev_server.py &
    BACKEND_PID=$!
    
    echo "🚀 启动前端服务..."
    cd frontend
    $PACKAGE_MANAGER run dev &
    FRONTEND_PID=$!
    cd ..
    
    # 等待用户中断
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
    wait
fi

