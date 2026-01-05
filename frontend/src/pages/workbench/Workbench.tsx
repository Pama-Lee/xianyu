import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { 
  Search, Send, Image, Zap, User, Package,
  Loader2, Wifi, WifiOff
} from 'lucide-react'
import { 
  getChatSessions, getChatMessages, sendChatMessage, markMessagesRead, 
  getQuickReplies,
  type ChatSession, type ChatMessage, type QuickReply 
} from '@/api/chat'
import { getAccounts } from '@/api/accounts'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { PageLoading } from '@/components/common/Loading'
import { Select } from '@/components/common/Select'
import { useChat, wsMessageToChatMessage, type WebSocketMessage } from '@/hooks/useChat'
import type { Account } from '@/types'

export function Workbench() {
  const { addToast } = useUIStore()
  const { isAuthenticated, token, _hasHydrated } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // 状态
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState(searchParams.get('cookie_id') || '')
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  
  // 输入状态
  const [messageInput, setMessageInput] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  
  // 加载状态
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  
  // 引用
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageContainerRef = useRef<HTMLDivElement>(null)

  // WebSocket 连接 - 只在选择了账号时才启用
  const { isConnected } = useChat({
    cookieId: selectedAccount || undefined,
    enabled: !!selectedAccount,  // 只有选中账号时才启用连接
    onNewMessage: useCallback((wsMsg: WebSocketMessage) => {
      // 检查是否是当前选中会话的消息
      const isCurrentSession = selectedSession && 
        wsMsg.buyer_id === selectedSession.buyer_id &&
        (wsMsg.item_id || '') === (selectedSession.item_id || '')
      
      if (isCurrentSession) {
        const newMessage = wsMessageToChatMessage(wsMsg)
        setMessages(prev => [...prev, newMessage])
        // 滚动到底部
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
      
      // 更新或添加会话到列表
      setSessions(prev => {
        const sessionId = `${wsMsg.buyer_id}_${wsMsg.item_id || ''}`
        const existingIndex = prev.findIndex(s => s.id === sessionId)
        
        if (existingIndex >= 0) {
          // 更新已存在的会话
          const updated = [...prev]
          updated[existingIndex] = {
            ...updated[existingIndex],
            last_message: wsMsg.message || updated[existingIndex].last_message,
            last_message_time: wsMsg.timestamp || updated[existingIndex].last_message_time,
            unread_count: isCurrentSession 
              ? updated[existingIndex].unread_count 
              : updated[existingIndex].unread_count + 1
          }
          // 将更新的会话移到顶部
          const [movedSession] = updated.splice(existingIndex, 1)
          return [movedSession, ...updated]
        } else {
          // 添加新会话到列表顶部
          const newSession: ChatSession = {
            id: sessionId,
            cookie_id: wsMsg.cookie_id || selectedAccount || '',
            buyer_id: wsMsg.buyer_id || '',
            buyer_name: wsMsg.buyer_name || null,
            buyer_avatar: wsMsg.buyer_avatar || null,
            item_id: wsMsg.item_id || null,
            item_title: null,  // 稍后从API获取
            item_image: null,
            chat_id: wsMsg.chat_id || '',
            last_message: wsMsg.message || null,
            last_message_time: wsMsg.timestamp || new Date().toISOString(),
            unread_count: isCurrentSession ? 0 : 1
          }
          return [newSession, ...prev]
        }
      })
    }, [selectedSession, selectedAccount])
  })

  // 加载账号列表
  const loadAccounts = async () => {
    try {
      const data = await getAccounts()
      setAccounts(data)
      if (data.length > 0 && !selectedAccount) {
        setSelectedAccount(data[0].id)
      }
    } catch {
      // ignore
    }
  }

  // 加载会话列表
  const loadSessions = useCallback(async () => {
    if (!selectedAccount) return
    
    setLoadingSessions(true)
    try {
      const result = await getChatSessions(selectedAccount)
      if (result.success) {
        // 过滤搜索
        let filtered = result.sessions
        if (searchKeyword) {
          const keyword = searchKeyword.toLowerCase()
          filtered = filtered.filter(s => 
            s.buyer_name?.toLowerCase().includes(keyword) ||
            s.buyer_id.includes(keyword) ||
            s.item_title?.toLowerCase().includes(keyword)
          )
        }
        setSessions(filtered)
        
        // 如果URL中指定了buyer_id和item_id，自动选中
        const urlBuyerId = searchParams.get('buyer_id')
        const urlItemId = searchParams.get('item_id')
        if (urlBuyerId) {
          const targetSession = filtered.find(s => 
            s.buyer_id === urlBuyerId && 
            (urlItemId ? s.item_id === urlItemId : true)
          )
          if (targetSession) {
            setSelectedSession(targetSession)
          }
        }
      }
    } catch {
      addToast({ type: 'error', message: '加载会话列表失败' })
    } finally {
      setLoadingSessions(false)
    }
  }, [selectedAccount, searchKeyword, searchParams, addToast])

  // 加载聊天记录
  const loadMessages = useCallback(async () => {
    if (!selectedAccount || !selectedSession) return
    
    setLoadingMessages(true)
    try {
      const result = await getChatMessages(selectedAccount, selectedSession.buyer_id, {
        page_size: 100
      })
      if (result.success) {
        // 过滤当前商品的消息
        const filtered = result.messages.filter(m => 
          (m.item_id || '') === (selectedSession.item_id || '')
        )
        setMessages(filtered)
        // 滚动到底部
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
        }, 100)
        
        // 标记已读
        if (selectedSession.unread_count > 0) {
          await markMessagesRead(selectedAccount, selectedSession.buyer_id)
          setSessions(prev => prev.map(s => 
            s.id === selectedSession.id ? { ...s, unread_count: 0 } : s
          ))
        }
      }
    } catch {
      addToast({ type: 'error', message: '加载聊天记录失败' })
    } finally {
      setLoadingMessages(false)
    }
  }, [selectedAccount, selectedSession, addToast])

  // 加载快捷回复
  const loadQuickReplies = async () => {
    try {
      const result = await getQuickReplies()
      if (result.success) {
        setQuickReplies(result.data)
      }
    } catch {
      // ignore
    }
  }

  // 发送消息
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedAccount || !selectedSession || sending) return
    
    // 从会话或消息列表中获取 chat_id
    const chatId = selectedSession.chat_id || (messages.length > 0 ? messages[0].chat_id : undefined)
    if (!chatId) {
      addToast({ type: 'error', message: '无法获取会话ID，请先等待买家发送消息' })
      return
    }
    
    const content = messageInput.trim()
    setMessageInput('')
    setSending(true)
    
    try {
      const result = await sendChatMessage(selectedAccount, selectedSession.buyer_id, {
        message: content,
        message_type: 'text',
        chat_id: chatId
      })
      
      if (result.success) {
        // 添加到消息列表
        const newMessage: ChatMessage = {
          id: Date.now(),
          cookie_id: selectedAccount,
          chat_id: chatId,
          buyer_id: selectedSession.buyer_id,
          item_id: selectedSession.item_id,
          sender_type: 'seller',
          message_type: 'text',
          content,
          image_url: null,
          is_read: true,
          created_at: new Date().toISOString()
        }
        setMessages(prev => [...prev, newMessage])
        
        // 滚动到底部
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      } else {
        addToast({ type: 'error', message: result.message || '发送失败' })
        setMessageInput(content) // 恢复输入
      }
    } catch (e: any) {
      addToast({ type: 'error', message: e?.message || '发送消息失败' })
      setMessageInput(content)
    } finally {
      setSending(false)
    }
  }

  // 使用快捷回复
  const handleQuickReply = (reply: QuickReply) => {
    setMessageInput(reply.content)
    setShowQuickReplies(false)
  }

  // 选择会话
  const handleSelectSession = (session: ChatSession) => {
    setSelectedSession(session)
    setSearchParams({ 
      cookie_id: selectedAccount, 
      buyer_id: session.buyer_id,
      item_id: session.item_id || ''
    })
  }

  // 初始化
  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated || !token) return
    loadAccounts()
    loadQuickReplies()
  }, [_hasHydrated, isAuthenticated, token])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  // 格式化时间
  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    
    if (isToday) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (!_hasHydrated) {
    return <PageLoading />
  }

  return (
    <div className="h-[calc(100vh-120px)] flex bg-gray-50 dark:bg-slate-900 -m-6 rounded-lg overflow-hidden">
      {/* 左侧会话列表 */}
      <div className="w-80 flex-shrink-0 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* 账号选择 */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-700">
          <Select
            value={selectedAccount}
            onChange={(value) => {
              setSelectedAccount(value)
              setSelectedSession(null)
              setMessages([])
            }}
            options={accounts.map((acc) => ({
              value: acc.id,
              label: acc.remark || acc.id
            }))}
            placeholder="选择账号"
          />
        </div>

        {/* 搜索 */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索买家/商品..."
              className="input-ios pl-10 w-full text-sm"
            />
          </div>
        </div>

        {/* 会话列表 */}
        <div className="flex-1 overflow-y-auto">
          {loadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              暂无会话消息
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSelectSession(session)}
                  className={`flex items-start gap-3 p-3 cursor-pointer transition-colors ${
                    selectedSession?.id === session.id
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {/* 头像 */}
                  <div className="relative flex-shrink-0">
                    {session.buyer_avatar ? (
                      <img
                        src={session.buyer_avatar}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                    {session.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                        {session.unread_count > 99 ? '99+' : session.unread_count}
                      </span>
                    )}
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                        {session.buyer_name || session.buyer_id.slice(0, 8)}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {session.last_message_time ? formatTime(session.last_message_time) : ''}
                      </span>
                    </div>
                    {/* 商品信息 */}
                    {session.item_id && (
                      <div className="flex items-center gap-1.5 mt-1">
                        {session.item_image ? (
                          <img src={session.item_image} alt="" className="w-4 h-4 rounded object-cover" />
                        ) : (
                          <Package className="w-3 h-3 text-gray-400" />
                        )}
                        <span className="text-xs text-blue-500 truncate">
                          {session.item_title || `商品${session.item_id.slice(-6)}`}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {session.last_message || '暂无消息'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 右侧聊天区域 */}
      <div className="flex-1 flex flex-col bg-gray-100 dark:bg-slate-900">
        {selectedSession ? (
          <>
            {/* 聊天头部 */}
            <div className="px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedSession.buyer_avatar ? (
                    <img
                      src={selectedSession.buyer_avatar}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      {selectedSession.buyer_name || selectedSession.buyer_id.slice(0, 12)}
                    </div>
                    <div className="text-xs text-gray-400">
                      ID: {selectedSession.buyer_id}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* 连接状态 */}
                  <div className={`flex items-center gap-1 text-xs ${isConnected ? 'text-green-500' : 'text-gray-400'}`}>
                    {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    {isConnected ? '在线' : '离线'}
                  </div>
                </div>
              </div>
              
              {/* 商品信息 */}
              {selectedSession.item_id && (
                <div className="mt-3 flex items-center gap-3 p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  {selectedSession.item_image ? (
                    <img
                      src={selectedSession.item_image}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {selectedSession.item_title || '商品详情'}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      商品ID: {selectedSession.item_id}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 消息列表 */}
            <div 
              ref={messageContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {loadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  暂无聊天记录
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === 'seller' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${msg.sender_type === 'seller' ? 'order-2' : 'order-1'}`}>
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            msg.sender_type === 'seller'
                              ? 'bg-blue-500 text-white rounded-br-md'
                              : 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-bl-md shadow-sm'
                          }`}
                        >
                          {msg.message_type === 'image' && msg.image_url ? (
                            <img
                              src={msg.image_url}
                              alt="图片"
                              className="max-w-full rounded-lg"
                            />
                          ) : (
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          )}
                        </div>
                        <div className={`text-xs text-gray-400 mt-1 ${msg.sender_type === 'seller' ? 'text-right' : 'text-left'}`}>
                          {formatTime(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* 输入区域 */}
            <div className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-gray-700 p-3">
              {/* 快捷回复面板 */}
              {showQuickReplies && (
                <div className="mb-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg max-h-40 overflow-y-auto">
                  {quickReplies.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center">暂无快捷回复</p>
                  ) : (
                    <div className="space-y-2">
                      {quickReplies.map((reply) => (
                        <button
                          key={reply.id}
                          onClick={() => handleQuickReply(reply)}
                          className="w-full text-left px-3 py-2 text-sm bg-white dark:bg-slate-600 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-500 transition-colors"
                        >
                          <div className="font-medium text-gray-700 dark:text-gray-200">{reply.title}</div>
                          <div className="text-gray-500 dark:text-gray-400 text-xs truncate mt-0.5">{reply.content}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 工具栏和输入框 */}
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowQuickReplies(!showQuickReplies)}
                    className={`p-2 rounded-lg transition-colors ${
                      showQuickReplies 
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                        : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500'
                    }`}
                    title="快捷回复"
                  >
                    <Zap className="w-5 h-5" />
                  </button>
                  <button
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-500 transition-colors"
                    title="发送图片"
                  >
                    <Image className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder="输入消息... (Enter发送, Shift+Enter换行)"
                    className="input-ios w-full resize-none text-sm"
                    rows={1}
                    style={{ minHeight: '40px', maxHeight: '120px' }}
                  />
                </div>
                
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sending}
                  className="p-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* 未选择会话时的占位 */
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center mb-4">
              <User className="w-12 h-12" />
            </div>
            <p className="text-lg">选择一个会话开始聊天</p>
            <p className="text-sm mt-2">或从左侧搜索买家/商品</p>
          </div>
        )}
      </div>
    </div>
  )
}

