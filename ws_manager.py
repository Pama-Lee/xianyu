"""
WebSocket Manager - 用于管理前端WebSocket连接和实时消息推送
"""
import asyncio
import json
from typing import Dict, Set
from fastapi import WebSocket
from loguru import logger


class WSManager:
    """WebSocket连接管理器"""
    
    def __init__(self):
        # cookie_id -> Set[WebSocket] 的映射
        self.connections: Dict[str, Set[WebSocket]] = {}
        # 全局连接（用于管理员查看所有消息）
        self.global_connections: Set[WebSocket] = set()
        self.lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket, cookie_id: str = None):
        """建立WebSocket连接
        
        Args:
            websocket: WebSocket连接对象
            cookie_id: 账号ID，如果为None则为全局连接
        """
        await websocket.accept()
        
        async with self.lock:
            if cookie_id:
                if cookie_id not in self.connections:
                    self.connections[cookie_id] = set()
                self.connections[cookie_id].add(websocket)
                logger.info(f"WebSocket连接建立: cookie_id={cookie_id}, 当前连接数={len(self.connections[cookie_id])}")
            else:
                self.global_connections.add(websocket)
                logger.info(f"全局WebSocket连接建立, 当前连接数={len(self.global_connections)}")
    
    async def disconnect(self, websocket: WebSocket, cookie_id: str = None):
        """断开WebSocket连接"""
        async with self.lock:
            if cookie_id:
                if cookie_id in self.connections:
                    self.connections[cookie_id].discard(websocket)
                    if not self.connections[cookie_id]:
                        del self.connections[cookie_id]
                    logger.info(f"WebSocket连接断开: cookie_id={cookie_id}")
            else:
                self.global_connections.discard(websocket)
                logger.info("全局WebSocket连接断开")
    
    async def broadcast_new_message(self, cookie_id: str, message: dict):
        """广播新消息到指定账号的所有连接
        
        Args:
            cookie_id: 账号ID
            message: 消息内容
        """
        message_json = json.dumps(message, ensure_ascii=False)
        
        # 发送给指定账号的连接
        if cookie_id in self.connections:
            dead_connections = set()
            for ws in self.connections[cookie_id]:
                try:
                    await ws.send_text(message_json)
                except Exception as e:
                    logger.warning(f"发送消息失败，连接可能已断开: {e}")
                    dead_connections.add(ws)
            
            # 清理断开的连接
            for ws in dead_connections:
                await self.disconnect(ws, cookie_id)
        
        # 同时发送给全局连接
        dead_global = set()
        for ws in self.global_connections:
            try:
                await ws.send_text(message_json)
            except Exception as e:
                logger.warning(f"发送全局消息失败: {e}")
                dead_global.add(ws)
        
        for ws in dead_global:
            await self.disconnect(ws, None)
    
    async def broadcast_to_all(self, message: dict):
        """广播消息到所有连接"""
        message_json = json.dumps(message, ensure_ascii=False)
        
        # 发送给所有账号的连接
        for cookie_id, connections in list(self.connections.items()):
            dead_connections = set()
            for ws in connections:
                try:
                    await ws.send_text(message_json)
                except Exception:
                    dead_connections.add(ws)
            
            for ws in dead_connections:
                await self.disconnect(ws, cookie_id)
        
        # 发送给全局连接
        dead_global = set()
        for ws in self.global_connections:
            try:
                await ws.send_text(message_json)
            except Exception:
                dead_global.add(ws)
        
        for ws in dead_global:
            await self.disconnect(ws, None)
    
    async def send_to_connection(self, websocket: WebSocket, message: dict):
        """发送消息到特定连接"""
        try:
            await websocket.send_text(json.dumps(message, ensure_ascii=False))
            return True
        except Exception as e:
            logger.warning(f"发送消息到特定连接失败: {e}")
            return False
    
    def get_connection_count(self, cookie_id: str = None) -> int:
        """获取连接数量"""
        if cookie_id:
            return len(self.connections.get(cookie_id, set()))
        return sum(len(conns) for conns in self.connections.values()) + len(self.global_connections)
    
    def get_connected_accounts(self) -> list:
        """获取所有有连接的账号ID列表"""
        return list(self.connections.keys())


# 全局单例
ws_manager = WSManager()

