@echo off
REM 本地开发环境启动脚本（Windows，支持热重载）

echo 🚀 启动本地开发环境...

REM 检查 Python 环境
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未找到 Python，请先安装 Python 3.11+
    pause
    exit /b 1
)

REM 检查 Node.js 环境
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

REM 检查 pnpm
pnpm --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  未找到 pnpm，尝试使用 npm...
    set PACKAGE_MANAGER=npm
) else (
    set PACKAGE_MANAGER=pnpm
)

REM 检查 Python 虚拟环境
if not exist "venv" (
    echo 📦 创建 Python 虚拟环境...
    python -m venv venv
)

echo 📦 激活虚拟环境并安装 Python 依赖...
call venv\Scripts\activate.bat
pip install --upgrade pip
pip install -r requirements.txt

REM 检查前端依赖
if not exist "frontend\node_modules" (
    echo 📦 安装前端依赖...
    cd frontend
    %PACKAGE_MANAGER% install
    cd ..
)

REM 创建日志目录
if not exist "logs" mkdir logs

echo.
echo ✅ 环境准备完成！
echo.
echo 📝 启动说明：
echo    - 后端服务: http://localhost:8080
echo    - 前端服务: http://localhost:3000
echo    - 访问前端即可，前端会自动代理 API 请求到后端
echo.
echo 🔄 热重载已启用：
echo    - 修改 Python 文件后，后端会自动重启
echo    - 修改前端文件后，浏览器会自动刷新
echo.
echo 按 Ctrl+C 停止服务
echo.

REM 启动后端（新窗口）
start "后端服务" cmd /k "venv\Scripts\activate.bat && python dev_server.py"

REM 等待一下让后端启动
timeout /t 2 /nobreak >nul

REM 启动前端（新窗口）
start "前端服务" cmd /k "cd frontend && %PACKAGE_MANAGER% run dev"

echo.
echo ✅ 前后端服务已启动！
echo    后端窗口和前端窗口已分别打开
echo    关闭对应窗口即可停止对应服务
echo.

pause

