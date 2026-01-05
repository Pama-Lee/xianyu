#!/usr/bin/env python3
"""
开发环境启动脚本 - 支持热重载
"""
import asyncio
import uvicorn
import cookie_manager as cm
from loguru import logger

def init_cookie_manager():
    """初始化 CookieManager（开发环境需要）"""
    try:
        # 如果 manager 已经初始化，跳过
        if cm.manager is not None:
            logger.info("CookieManager 已初始化")
            return
        
        # 创建事件循环并初始化 CookieManager
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        logger.info("正在初始化 CookieManager...")
        cm.manager = cm.CookieManager(loop)
        logger.info("CookieManager 初始化完成")
    except Exception as e:
        logger.error(f"CookieManager 初始化失败: {e}")
        import traceback
        logger.error(traceback.format_exc())

if __name__ == "__main__":
    # 在启动前初始化 CookieManager
    init_cookie_manager()
    
    uvicorn.run(
        "reply_server:app",
        host="0.0.0.0",
        port=8080,
        reload=True,  # 启用热重载
        reload_dirs=["./"],  # 监控当前目录下的文件变化
        reload_includes=["*.py"],  # 只监控 Python 文件
        log_level="info"
    )

