# 本地开发环境设置指南

## 快速开始

### macOS/Linux

```bash
# 1. 运行启动脚本（会自动安装依赖）
./start-dev.sh
```

### Windows

```cmd
# 1. 运行启动脚本（会自动安装依赖）
start-dev.bat
```

## 手动启动（如果脚本有问题）

### 1. 后端服务

```bash
# 创建虚拟环境（首次运行）
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install --upgrade pip
pip install -r requirements.txt

# 启动后端（支持热重载）
python3 dev_server.py
```

后端服务将在 `http://localhost:8080` 启动

### 2. 前端服务

```bash
cd frontend

# 安装依赖（首次运行）
pnpm install  # 或 npm install

# 启动前端开发服务器
pnpm run dev  # 或 npm run dev
```

前端服务将在 `http://localhost:3000` 启动

## 访问应用

打开浏览器访问：**http://localhost:3000**

前端会自动代理所有 API 请求到后端（`http://localhost:8080`）

## 热重载说明

### 后端热重载
- 修改任何 `.py` 文件后，uvicorn 会自动重启服务
- 无需手动重启

### 前端热重载
- 修改任何前端文件后，Vite 会自动刷新浏览器
- 支持 React Fast Refresh，组件状态会保留

## 端口说明

- **后端**: `8080` - FastAPI 服务
- **前端**: `3000` - Vite 开发服务器
- **WebSocket**: `ws://localhost:8080/ws/chat/{cookie_id}` - 实时消息推送

## 常见问题

### 1. 端口被占用

如果 8080 或 3000 端口被占用，可以修改：

**后端端口**：编辑 `dev_server.py`，修改 `port=8080`

**前端端口**：编辑 `frontend/vite.config.ts`，修改 `server.port`

### 2. Python 依赖安装失败

```bash
# 升级 pip
pip install --upgrade pip

# 使用国内镜像源（可选）
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### 3. 前端依赖安装失败

```bash
cd frontend

# 清除缓存重新安装
rm -rf node_modules pnpm-lock.yaml  # Windows: rmdir /s node_modules
pnpm install  # 或 npm install
```

### 4. 数据库文件位置

开发环境的数据库文件位于项目根目录：`xianyu.db`

## 开发建议

1. **使用虚拟环境**：避免污染系统 Python 环境
2. **代码格式化**：建议使用 `black` 格式化 Python 代码
3. **类型检查**：前端使用 TypeScript，确保类型正确
4. **日志查看**：后端日志会输出到控制台，也可以查看 `logs/` 目录

## 停止服务

- **macOS/Linux**: 按 `Ctrl+C`
- **Windows**: 关闭对应的命令行窗口

