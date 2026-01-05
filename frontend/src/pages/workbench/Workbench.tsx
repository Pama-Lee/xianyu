import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { 
  Search, Send, Image, Zap, User, Clock, ChevronLeft, 
  Loader2, AlertCircle, Wifi, WifiOff, MoreVertical, Tag
} from 'lucide-react'
import { 
  getBuyers, getChatMessages, sendChatMessage, markMessagesRead, 
  getQuickReplies,
  type Buyer, type ChatMessage, type QuickReply 
} from '@/api/chat'
import { getAccounts } from '@/api/accounts'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { PageLoading } from '@/components/common/Loading'
import { Select } from '@/components/common/Select'
import { useChat, wsMessageToChatMessage } from '@/hooks/useChat'
import type { Account } from '@/types'

export function Workbench() {
  const { addToast } = useUIStore()
  const { isAuthenticated, token, _hasHydrated } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // 状态
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState(searchParams.get('cookie_id') || '')
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  
  // 输入状态
  const [messageInput, setMessageInput] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  
  // 加载状态
  const [loadingBuyers, setLoadingBuyers] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  
  // 引用
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageContainerRef = useRef<HTMLDivElement>(null)

  // WebSocket 连接
  const { isConnected } = useChat({
    cookieId: selectedAccount || undefined,
    onNewMessage: useCallback((wsMsg) => {
      // 如果是当前选中买家的消息，添加到消息列表
      if (selectedBuyer && wsMsg.buyer_id === selectedBuyer.buyer_id) {
        const newMessage = wsMessageToChatMessage(wsMsg)
        setMessages(prev => [...prev, newMessage])
        // 滚动到底部
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
      
      // 更新买家列表中的最后消息
      setBuyers(prev => prev.map(b => {
        if (b.buyer_id === wsMsg.buyer_id && b.cookie_id === wsMsg.cookie_id) {
          return {
            ...b,
            last_message: wsMsg.message || b.last_message,
            last_message_time: wsMsg.timestamp || b.last_message_time,
            unread_count: b.buyer_id === selectedBuyer?.buyer_id ? b.unread_count : b.unread_count + 1
          }
        }
        return b
      }))
    }, [selectedBuyer])
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

  // 加载买家列表
  const loadBuyers = useCallback(async () => {
    if (!selectedAccount) return
    
    setLoadingBuyers(true)
    try {
      const result = await getBuyers({
        cookie_id: selectedAccount,
        search: searchKeyword || undefined,
        page_size: 100
      })
      if (result.success) {
        setBuyers(result.buyers)
        
        // 如果URL中指定了buyer_id，自动选中
        const urlBuyerId = searchParams.get('buyer_id')
        if (urlBuyerId) {
          const targetBuyer = result.buyers.find(b => b.buyer_id === urlBuyerId)
          if (targetBuyer) {
            setSelectedBuyer(targetBuyer)
          }
        }
      }
    } catch {
      addToast({ type: 'error', message: '加载买家列表失败' })
    } finally {
      setLoadingBuyers(false)
    }
  }, [selectedAccount, searchKeyword, searchParams, addToast])

  // 加载聊天记录
  const loadMessages = useCallback(async () => {
    if (!selectedAccount || !selectedBuyer) return
    
    setLoadingMessages(true)
    try {
      const result = await getChatMessages(selectedAccount, selectedBuyer.buyer_id, {
        page_size: 100
      })
      if (result.success) {
        setMessages(result.messages)
        // 滚动到底部
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
        }, 100)
        
        // 标记已读
        if (selectedBuyer.unread_count > 0) {
          await markMessagesRead(selectedAccount, selectedBuyer.buyer_id)
          setBuyers(prev => prev.map(b => 
            b.buyer_id === selectedBuyer.buyer_id ? { ...b, unread_count: 0 } : b
          ))
        }
      }
    } catch {
      addToast({ type: 'error', message: '加载聊天记录失败' })
    } finally {
      setLoadingMessages(false)
    }
  }, [selectedAccount, selectedBuyer, addToast])

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
    if (!messageInput.trim() || !selectedAccount || !selectedBuyer || sending) return
    
    const content = messageInput.trim()
    setMessageInput('')
    setSending(true)
    
    try {
      const result = await sendChatMessage(selectedAccount, selectedBuyer.buyer_id, {
        message: content,
        message_type: 'text'
      })
      
      if (result.success) {
        // 添加到消息列表
        const newMessage: ChatMessage = {
          id: Date.now(),
          cookie_id: selectedAccount,
          chat_id: selectedBuyer.buyer_id,
          buyer_id: selectedBuyer.buyer_id,
          item_id: null,
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

  // 选择买家
  const handleSelectBuyer = (buyer: Buyer) => {
    setSelectedBuyer(buyer)
    setSearchParams({ cookie_id: selectedAccount, buyer_id: buyer.buyer_id })
  }

  // 初始化
  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated || !token) return
    loadAccounts()
    loadQuickReplies()
  }, [_hasHydrated, isAuthenticated, token])

  useEffect(() => {
    loadBuyers()
  }, [loadBuyers])

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
      {/* 左侧买家列表 */}
      <div className="w-80 flex-shrink-0 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* 账号选择 */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-700">
          <Select
            value={selectedAccount}
            onChange={(value) => {
              setSelectedAccount(value)
              setSelectedBuyer(null)
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
              placeholder="搜索买家..."
              className="input-ios pl-10 w-full text-sm"
            />
          </div>
        </div>

        {/* 买家列表 */}
        <div className="flex-1 overflow-y-auto">
          {loadingBuyers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : buyers.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              暂无买家消息
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {buyers.map((buyer) => (
                <div
                  key={buyer.buyer_id}
                  onClick={() => handleSelectBuyer(buyer)}
                  className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                    selectedBuyer?.buyer_id === buyer.buyer_id
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {/* 头像 */}
                  <div className="relative flex-shrink-0">
                    {buyer.buyer_avatar ? (
                      <img
                        src={buyer.buyer_avatar}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                    {buyer.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                        {buyer.unread_count > 99 ? '99+' : buyer.unread_count}
                      </span>
                    )}
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                        {buyer.buyer_name || buyer.buyer_id.slice(0, 8)}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {buyer.last_message_time ? formatTime(buyer.last_message_time) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {buyer.last_message || '暂无消息'}
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
        {selectedBuyer ? (
          <>
            {/* 聊天头部 */}
            <div className="h-14 px-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                {selectedBuyer.buyer_avatar ? (
                  <img
                    src={selectedBuyer.buyer_avatar}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
                <div>
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    {selectedBuyer.buyer_name || selectedBuyer.buyer_id}
                  </div>
                  <div className="text-xs text-gray-400">
                    ID: {selectedBuyer.buyer_id}
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
          /* 未选择买家时的占位 */
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center mb-4">
              <User className="w-12 h-12" />
            </div>
            <p className="text-lg">选择一个买家开始聊天</p>
            <p className="text-sm mt-2">或从左侧搜索买家</p>
          </div>
        )}
      </div>
    </div>
  )
}

