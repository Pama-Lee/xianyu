import { useEffect, useRef, useState, useCallback } from 'react'
import type { ChatMessage } from '@/api/chat'

export interface WebSocketMessage {
  type: 'new_message' | 'pong' | string
  cookie_id?: string
  chat_id?: string
  buyer_id?: string
  buyer_name?: string
  buyer_avatar?: string
  message?: string
  message_type?: string
  item_id?: string
  timestamp?: string
}

interface UseChatOptions {
  cookieId?: string
  onNewMessage?: (message: WebSocketMessage) => void
  autoReconnect?: boolean
  reconnectInterval?: number
}

export function useChat(options: UseChatOptions = {}) {
  const {
    cookieId,
    onNewMessage,
    autoReconnect = true,
    reconnectInterval = 3000
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    
    // 清理现有连接
    if (wsRef.current) {
      wsRef.current.close()
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = cookieId 
      ? `${protocol}//${window.location.host}/ws/chat/${cookieId}`
      : `${protocol}//${window.location.host}/ws/chat`

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        setIsConnected(true)
        setConnectionError(null)
        console.log('WebSocket connected:', wsUrl)

        // 启动心跳
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
        }
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 30000) // 30秒发送一次心跳
      }

      ws.onmessage = (event) => {
        if (!mountedRef.current) return
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          
          if (message.type === 'pong') {
            // 心跳响应，忽略
            return
          }
          
          if (message.type === 'new_message' && onNewMessage) {
            onNewMessage(message)
          }
        } catch (e) {
          console.error('解析WebSocket消息失败:', e)
        }
      }

      ws.onclose = (event) => {
        if (!mountedRef.current) return
        setIsConnected(false)
        console.log('WebSocket closed:', event.code, event.reason)

        // 清理心跳
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
          pingIntervalRef.current = null
        }

        // 自动重连
        if (autoReconnect && mountedRef.current) {
          reconnectTimerRef.current = setTimeout(() => {
            if (mountedRef.current) {
              console.log('尝试重新连接WebSocket...')
              connect()
            }
          }, reconnectInterval)
        }
      }

      ws.onerror = (error) => {
        if (!mountedRef.current) return
        console.error('WebSocket error:', error)
        setConnectionError('WebSocket连接错误')
      }
    } catch (e) {
      console.error('创建WebSocket失败:', e)
      setConnectionError('创建WebSocket连接失败')
    }
  }, [cookieId, onNewMessage, autoReconnect, reconnectInterval])

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  const sendMessage = useCallback((message: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
      return true
    }
    return false
  }, [])

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      disconnect()
    }
  }, [connect, disconnect])

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    sendMessage
  }
}

// 将WebSocket消息转换为ChatMessage格式
export function wsMessageToChatMessage(wsMsg: WebSocketMessage): ChatMessage {
  return {
    id: Date.now(), // 临时ID
    cookie_id: wsMsg.cookie_id || '',
    chat_id: wsMsg.chat_id || '',
    buyer_id: wsMsg.buyer_id || '',
    item_id: wsMsg.item_id || null,
    sender_type: 'buyer',
    message_type: (wsMsg.message_type as 'text' | 'image' | 'card' | 'order') || 'text',
    content: wsMsg.message || '',
    image_url: null,
    is_read: false,
    created_at: wsMsg.timestamp || new Date().toISOString()
  }
}

