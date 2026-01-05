import { useEffect, useState, useCallback } from 'react'
import { Search, MessageCircle, User, Package, Tag, Clock, ChevronRight, RefreshCw } from 'lucide-react'
import { getBuyers, type Buyer } from '@/api/chat'
import { getAccounts } from '@/api/accounts'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { PageLoading } from '@/components/common/Loading'
import { Select } from '@/components/common/Select'
import { useNavigate } from 'react-router-dom'
import type { Account } from '@/types'

export function Buyers() {
  const { addToast } = useUIStore()
  const { isAuthenticated, token, _hasHydrated } = useAuthStore()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  
  const pageSize = 30

  const loadBuyers = useCallback(async () => {
    if (!_hasHydrated || !isAuthenticated || !token) return
    
    try {
      setLoading(true)
      const result = await getBuyers({
        cookie_id: selectedAccount || undefined,
        search: searchKeyword || undefined,
        page,
        page_size: pageSize
      })
      
      if (result.success) {
        setBuyers(result.buyers)
        setTotal(result.total)
      }
    } catch {
      addToast({ type: 'error', message: '加载买家列表失败' })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [_hasHydrated, isAuthenticated, token, selectedAccount, searchKeyword, page, addToast])

  const loadAccounts = async () => {
    if (!_hasHydrated || !isAuthenticated || !token) return
    try {
      const data = await getAccounts()
      setAccounts(data)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated || !token) return
    loadAccounts()
  }, [_hasHydrated, isAuthenticated, token])

  useEffect(() => {
    loadBuyers()
  }, [loadBuyers])

  const handleRefresh = () => {
    setRefreshing(true)
    loadBuyers()
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadBuyers()
  }

  const handleOpenChat = (buyer: Buyer) => {
    // 导航到工作台并选中该买家
    navigate(`/workbench?cookie_id=${buyer.cookie_id}&buyer_id=${buyer.buyer_id}`)
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '未知'
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
    
    return date.toLocaleDateString()
  }

  const totalPages = Math.ceil(total / pageSize)

  if (!_hasHydrated) {
    return <PageLoading />
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">买家管理</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            查看和管理所有买家信息，共 {total} 位买家
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {/* 筛选栏 */}
      <div className="card-ios p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <Select
              value={selectedAccount}
              onChange={(value) => {
                setSelectedAccount(value)
                setPage(1)
              }}
              options={[
                { value: '', label: '全部账号' },
                ...accounts.map((acc) => ({
                  value: acc.id,
                  label: acc.remark || acc.id
                }))
              ]}
              placeholder="选择账号"
            />
          </div>
          
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索买家昵称或ID..."
              className="input-ios pl-10 w-full"
            />
          </div>
          
          <button type="submit" className="btn-ios-primary">
            搜索
          </button>
        </form>
      </div>

      {/* 买家列表 */}
      <div className="card-ios">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : buyers.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
            <p className="mt-4 text-gray-500 dark:text-gray-400">暂无买家数据</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              买家会在收到消息时自动记录
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {buyers.map((buyer) => (
              <div
                key={`${buyer.cookie_id}-${buyer.buyer_id}`}
                onClick={() => handleOpenChat(buyer)}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
              >
                {/* 头像 */}
                <div className="relative flex-shrink-0">
                  {buyer.buyer_avatar ? (
                    <img
                      src={buyer.buyer_avatar}
                      alt={buyer.buyer_name || '买家'}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                  )}
                  {buyer.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                      {buyer.unread_count > 99 ? '99+' : buyer.unread_count}
                    </span>
                  )}
                </div>

                {/* 买家信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white truncate">
                      {buyer.buyer_name || buyer.buyer_id}
                    </span>
                    {buyer.tags && buyer.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        {buyer.tags.slice(0, 2).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {buyer.tags.length > 2 && (
                          <span className="text-xs text-gray-400">+{buyer.tags.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {buyer.last_message || '暂无消息'}
                  </p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(buyer.last_message_time)}
                    </span>
                    {buyer.total_orders > 0 && (
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {buyer.total_orders} 单
                      </span>
                    )}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenChat(buyer)
                    }}
                    className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="发起聊天"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <div className="text-sm text-gray-500">
              第 {page} / {totalPages} 页，共 {total} 条
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

