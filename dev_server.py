#!/usr/bin/env python3
"""
开发环境启动脚本 - 支持热重载
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "reply_server:app",
        host="0.0.0.0",
        port=8080,
        reload=True,  # 启用热重载
        reload_dirs=["./"],  # 监控当前目录下的文件变化
        reload_includes=["*.py"],  # 只监控 Python 文件
        log_level="info"
    )

