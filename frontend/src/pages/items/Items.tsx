import { useEffect, useState } from 'react'
import { CheckSquare, Download, Edit2, ExternalLink, Link, Loader2, Package, RefreshCw, Search, Square, Trash2, X } from 'lucide-react'
import { batchDeleteItems, deleteItem, fetchAllItemsFromAccount, getItems, updateItem, updateItemMultiQuantityDelivery, updateItemMultiSpec } from '@/api/items'
import { getAccounts } from '@/api/accounts'
import { getItemBindings, createBinding, deleteBinding } from '@/api/bindings'
import { getCards, type CardData } from '@/api/cards'
import { useUIStore } from '@/store/uiStore'
import { PageLoading } from '@/components/common/Loading'
import { useAuthStore } from '@/store/authStore'
import { Select } from '@/components/common/Select'
import type { Account, Item, ItemCardBinding } from '@/types'

export function Items() {
  const { addToast } = useUIStore()
  const { isAuthenticated, token, _hasHydrated } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Item[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())
  const [fetching, setFetching] = useState(false)

  // 编辑弹窗状态
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [editDetail, setEditDetail] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // 绑定弹窗状态
  const [bindingItem, setBindingItem] = useState<Item | null>(null)
  const [itemBindings, setItemBindings] = useState<ItemCardBinding[]>([])
  const [cards, setCards] = useState<CardData[]>([])
  const [bindingCardId, setBindingCardId] = useState('')
  const [bindingSpecName, setBindingSpecName] = useState('')
  const [bindingSpecValue, setBindingSpecValue] = useState('')
  const [bindingSaving, setBindingSaving] = useState(false)
  const [bindingsLoading, setBindingsLoading] = useState(false)

  const loadItems = async () => {
    if (!_hasHydrated || !isAuthenticated || !token) {
      return
    }
    try {
      setLoading(true)
      const result = await getItems(selectedAccount || undefined)
      if (result.success) {
        setItems(result.data || [])
      }
    } catch {
      addToast({ type: 'error', message: '加载商品列表失败' })
    } finally {
      setLoading(false)
    }
  }

  const handleFetchItems = async () => {
    if (!selectedAccount) {
      addToast({ type: 'warning', message: '请先选择账号后再获取商品' })
      return
    }

    setFetching(true)

    try {
      // 使用获取所有页的接口，后端会自动遍历所有页
      const result = await fetchAllItemsFromAccount(selectedAccount)

      if (result.success) {
        const totalCount = (result as { total_count?: number }).total_count || 0
        const savedCount = (result as { saved_count?: number }).saved_count || 0
        addToast({ type: 'success', message: `成功获取商品，共 ${totalCount} 件，保存 ${savedCount} 件` })
        await loadItems()
      } else {
        addToast({ type: 'error', message: (result as { message?: string }).message || '获取商品失败' })
      }
    } catch {
      addToast({ type: 'error', message: '获取商品失败' })
    } finally {
      setFetching(false)
    }
  }

  const loadAccounts = async () => {
    if (!_hasHydrated || !isAuthenticated || !token) {
      return
    }
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
    loadItems()
  }, [_hasHydrated, isAuthenticated, token])

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated || !token) return
    loadItems()
  }, [_hasHydrated, isAuthenticated, token, selectedAccount])

  const handleDelete = async (item: Item) => {
    if (!confirm('确定要删除这个商品吗？')) return
    try {
      await deleteItem(item.cookie_id, item.item_id)
      addToast({ type: 'success', message: '删除成功' })
      loadItems()
    } catch {
      addToast({ type: 'error', message: '删除失败' })
    }
  }

  // 批量选择相关
  const toggleSelect = (id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredItems.map((item) => item.id)))
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) {
      addToast({ type: 'warning', message: '请先选择要删除的商品' })
      return
    }
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 个商品吗？`)) return
    try {
      // 将选中的 ID 转换为 { cookie_id, item_id } 格式
      const itemsToDelete = items
        .filter((item) => selectedIds.has(item.id))
        .map((item) => ({ cookie_id: item.cookie_id, item_id: item.item_id }))
      await batchDeleteItems(itemsToDelete)
      addToast({ type: 'success', message: `成功删除 ${selectedIds.size} 个商品` })
      setSelectedIds(new Set())
      loadItems()
    } catch {
      addToast({ type: 'error', message: '批量删除失败' })
    }
  }

  // 切换多数量发货状态
  const handleToggleMultiQuantity = async (item: Item) => {
    try {
      const newStatus = !item.multi_quantity_delivery
      await updateItemMultiQuantityDelivery(item.cookie_id, item.item_id, newStatus)
      addToast({ type: 'success', message: `多数量发货已${newStatus ? '开启' : '关闭'}` })
      loadItems()
    } catch {
      addToast({ type: 'error', message: '操作失败' })
    }
  }

  // 切换多规格状态
  const handleToggleMultiSpec = async (item: Item) => {
    try {
      const newStatus = !(item.is_multi_spec || item.has_sku)
      await updateItemMultiSpec(item.cookie_id, item.item_id, newStatus)
      addToast({ type: 'success', message: `多规格已${newStatus ? '开启' : '关闭'}` })
      loadItems()
    } catch {
      addToast({ type: 'error', message: '操作失败' })
    }
  }

  // 打开编辑弹窗
  const handleEdit = (item: Item) => {
    setEditingItem(item)
    setEditDetail(item.item_detail || item.desc || '')
  }

  // 加载卡券列表
  const loadCards = async () => {
    try {
      const result = await getCards()
      if (result.success) {
        setCards(result.data || [])
      }
    } catch {
      // ignore
    }
  }

  // 打开绑定弹窗
  const handleOpenBinding = async (item: Item) => {
    setBindingItem(item)
    setBindingCardId('')
    setBindingSpecName('')
    setBindingSpecValue('')
    setBindingsLoading(true)

    // 加载卡券列表
    if (cards.length === 0) {
      await loadCards()
    }

    // 加载该商品的绑定列表
    try {
      const result = await getItemBindings(item.cookie_id, item.item_id)
      if (result.success) {
        setItemBindings(result.data || [])
      }
    } catch {
      addToast({ type: 'error', message: '加载绑定信息失败' })
    } finally {
      setBindingsLoading(false)
    }
  }

  // 创建绑定
  const handleCreateBinding = async () => {
    if (!bindingItem || !bindingCardId) {
      addToast({ type: 'warning', message: '请选择要绑定的卡券' })
      return
    }

    setBindingSaving(true)
    try {
      const result = await createBinding(bindingItem.cookie_id, bindingItem.item_id, {
        card_id: parseInt(bindingCardId),
        spec_name: bindingSpecName || undefined,
        spec_value: bindingSpecValue || undefined,
        enabled: true,
      })

      if (result.success) {
        addToast({ type: 'success', message: '绑定创建成功' })
        // 重新加载绑定列表
        const refreshResult = await getItemBindings(bindingItem.cookie_id, bindingItem.item_id)
        if (refreshResult.success) {
          setItemBindings(refreshResult.data || [])
        }
        // 清空表单
        setBindingCardId('')
        setBindingSpecName('')
        setBindingSpecValue('')
      } else {
        addToast({ type: 'error', message: result.message || '绑定创建失败' })
      }
    } catch {
      addToast({ type: 'error', message: '绑定创建失败' })
    } finally {
      setBindingSaving(false)
    }
  }

  // 删除绑定
  const handleDeleteBinding = async (bindingId: number) => {
    if (!confirm('确定要删除这个绑定吗？')) return

    try {
      const result = await deleteBinding(bindingId)
      if (result.success) {
        addToast({ type: 'success', message: '绑定删除成功' })
        // 从列表中移除
        setItemBindings(prev => prev.filter(b => b.id !== bindingId))
      } else {
        addToast({ type: 'error', message: '删除失败' })
      }
    } catch {
      addToast({ type: 'error', message: '删除失败' })
    }
  }

  // 关闭绑定弹窗
  const handleCloseBinding = () => {
    setBindingItem(null)
    setItemBindings([])
    setBindingCardId('')
    setBindingSpecName('')
    setBindingSpecValue('')
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingItem) return
    setEditSaving(true)
    try {
      await updateItem(editingItem.cookie_id, editingItem.item_id, {
        item_detail: editDetail,
      })
      addToast({ type: 'success', message: '商品详情已更新' })
      setEditingItem(null)
      loadItems()
    } catch {
      addToast({ type: 'error', message: '更新失败' })
    } finally {
      setEditSaving(false)
    }
  }

  const filteredItems = items.filter((item) => {
    if (!searchKeyword) return true
    const keyword = searchKeyword.toLowerCase()
    const title = item.item_title || item.title || ''
    const desc = item.item_detail || item.desc || ''
    return (
      title.toLowerCase().includes(keyword) ||
      desc.toLowerCase().includes(keyword) ||
      item.item_id?.includes(keyword)
    )
  })

  if (loading) {
    return <PageLoading />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header flex-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">商品管理</h1>
          <p className="page-description">管理各账号的商品信息</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedIds.size > 0 && (
            <button onClick={handleBatchDelete} className="btn-ios-danger">
              <Trash2 className="w-4 h-4" />
              删除选中 ({selectedIds.size})
            </button>
          )}
          <button
            onClick={handleFetchItems}
            disabled={fetching}
            className="btn-ios-primary"
          >
            {fetching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                获取中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                获取商品
              </>
            )}
          </button>
          <button onClick={loadItems} className="btn-ios-secondary">
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="vben-card">
        <div className="vben-card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">筛选账号</label>
              <Select
                value={selectedAccount}
                onChange={setSelectedAccount}
                options={[
                  { value: '', label: '所有账号' },
                  ...accounts.map((account) => ({
                    value: account.id,
                    label: account.id,
                  })),
                ]}
                placeholder="所有账号"
              />
            </div>
            <div className="input-group">
              <label className="input-label">搜索商品</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="搜索商品标题或详情..."
                  className="input-ios pl-9"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="vben-card">
        <div className="vben-card-header">
          <h2 className="vben-card-title ">
            <Package className="w-4 h-4" />
            商品列表
          </h2>
          <span className="badge-primary">{filteredItems.length} 个商品</span>
        </div>
        <div className="overflow-x-auto">
          <table className="table-ios min-w-[900px]">
            <thead>
              <tr>
                <th className="w-10 whitespace-nowrap">
                  <button
                    onClick={toggleSelectAll}
                    className="p-1 hover:bg-gray-100 rounded"
                    title={selectedIds.size === filteredItems.length ? '取消全选' : '全选'}
                  >
                    {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="whitespace-nowrap">账号ID</th>
                <th className="whitespace-nowrap">商品ID</th>
                <th className="whitespace-nowrap">商品标题</th>
                <th className="whitespace-nowrap">价格</th>
                <th className="whitespace-nowrap">发货绑定</th>
                <th className="whitespace-nowrap">多规格</th>
                <th className="whitespace-nowrap">多数量发货</th>
                <th className="whitespace-nowrap">更新时间</th>
                <th className="whitespace-nowrap sticky right-0 bg-slate-50 dark:bg-slate-800">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <div className="empty-state py-8">
                      <Package className="empty-state-icon" />
                      <p className="text-gray-500">暂无商品数据</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className={selectedIds.has(item.id) ? 'bg-blue-50 dark:bg-blue-900/30' : ''}>
                    <td>
                      <button
                        onClick={() => toggleSelect(item.id)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        {selectedIds.has(item.id) ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="font-medium text-blue-600 dark:text-blue-400">{item.cookie_id}</td>
                    <td className="text-xs text-gray-500">
                      <a
                        href={`https://www.goofish.com/item?id=${item.item_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-500 flex items-center gap-1"
                      >
                        {item.item_id}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="max-w-[280px]">
                      <div
                        className="font-medium line-clamp-2 cursor-help"
                        title={item.item_title || item.title || '-'}
                      >
                        {item.item_title || item.title || '-'}
                      </div>
                      {(item.item_detail || item.desc) && (
                        <div
                          className="text-xs text-gray-400 line-clamp-1 mt-0.5 cursor-help"
                          title={item.item_detail || item.desc}
                        >
                          {item.item_detail || item.desc}
                        </div>
                      )}
                    </td>
                    <td className="text-amber-600 font-medium">
                      {item.item_price || (item.price ? `¥${item.price}` : '-')}
                    </td>
                    <td>
                      <button
                        onClick={() => handleOpenBinding(item)}
                        className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 transition-colors flex items-center gap-1"
                        title="配置发货绑定"
                      >
                        <Link className="w-3 h-3" />
                        绑定
                      </button>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleMultiSpec(item)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          (item.is_multi_spec || item.has_sku)
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                        title={(item.is_multi_spec || item.has_sku) ? '点击关闭多规格' : '点击开启多规格'}
                      >
                        {(item.is_multi_spec || item.has_sku) ? '已开启' : '已关闭'}
                      </button>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleMultiQuantity(item)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          item.multi_quantity_delivery
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                        title={item.multi_quantity_delivery ? '点击关闭多数量发货' : '点击开启多数量发货'}
                      >
                        {item.multi_quantity_delivery ? '已开启' : '已关闭'}
                      </button>
                    </td>
                    <td className="text-gray-500 text-xs">
                      {item.updated_at ? new Date(item.updated_at).toLocaleString() : '-'}
                    </td>
                    <td className="sticky right-0 bg-white dark:bg-slate-900">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(item)}
                          className="table-action-btn hover:!bg-blue-50"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4 text-blue-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="table-action-btn hover:!bg-red-50"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 编辑弹窗 */}
      {editingItem && (
        <div className="modal-overlay">
          <div className="modal-content max-w-lg">
            <div className="modal-header">
              <h2 className="modal-title">编辑商品</h2>
              <button onClick={() => setEditingItem(null)} className="modal-close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="modal-body space-y-4">
              <div className="input-group">
                <label className="input-label">商品ID</label>
                <input
                  type="text"
                  value={editingItem.item_id}
                  disabled
                  className="input-ios bg-slate-100 dark:bg-slate-700"
                />
              </div>
              <div className="input-group">
                <label className="input-label">商品标题</label>
                <input
                  type="text"
                  value={editingItem.item_title || editingItem.title || ''}
                  disabled
                  className="input-ios bg-slate-100 dark:bg-slate-700"
                />
              </div>
              <div className="input-group">
                <label className="input-label">商品详情</label>
                <textarea
                  value={editDetail}
                  onChange={(e) => setEditDetail(e.target.value)}
                  className="input-ios h-32 resize-none"
                  placeholder="输入商品详情..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="btn-ios-secondary"
                disabled={editSaving}
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="btn-ios-primary"
                disabled={editSaving}
              >
                {editSaving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    保存中...
                  </span>
                ) : (
                  '保存'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 绑定弹窗 */}
      {bindingItem && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl">
            <div className="modal-header">
              <h2 className="modal-title">配置发货绑定</h2>
              <button onClick={handleCloseBinding} className="modal-close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="modal-body space-y-4">
              {/* 商品信息 */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">商品信息</div>
                <div className="font-medium mt-1">{bindingItem.item_title || bindingItem.title || bindingItem.item_id}</div>
                <div className="text-xs text-gray-400 mt-1">ID: {bindingItem.item_id}</div>
              </div>

              {/* 现有绑定列表 */}
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  已绑定的卡券 ({itemBindings.length})
                </div>
                {bindingsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-500">加载中...</span>
                  </div>
                ) : itemBindings.length === 0 ? (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    暂无绑定，请在下方添加
                  </div>
                ) : (
                  <div className="space-y-2">
                    {itemBindings.map((binding) => (
                      <div
                        key={binding.id}
                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {binding.card_name || `卡券 #${binding.card_id}`}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {binding.card_type && (
                              <span className={`inline-block px-1.5 py-0.5 rounded mr-2 ${
                                binding.card_type === 'api' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                binding.card_type === 'text' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                binding.card_type === 'data' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                              }`}>
                                {binding.card_type === 'api' ? 'API' :
                                 binding.card_type === 'text' ? '文本' :
                                 binding.card_type === 'data' ? '批量' : '图片'}
                              </span>
                            )}
                            {binding.spec_name && binding.spec_value && (
                              <span className="text-purple-600 dark:text-purple-400">
                                规格: {binding.spec_name}={binding.spec_value}
                              </span>
                            )}
                            {!binding.spec_name && !binding.spec_value && (
                              <span className="text-gray-400">通用绑定</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => binding.id && handleDeleteBinding(binding.id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="删除绑定"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 添加新绑定 */}
              <div className="border-t pt-4">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  添加新绑定
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="input-group md:col-span-2">
                    <label className="input-label">选择卡券 <span className="text-red-500">*</span></label>
                    <Select
                      value={bindingCardId}
                      onChange={setBindingCardId}
                      options={[
                        { value: '', label: '请选择卡券' },
                        ...cards.filter(c => c.enabled !== false).map((card) => ({
                          value: String(card.id),
                          label: `${card.name} (${
                            card.type === 'api' ? 'API' :
                            card.type === 'text' ? '文本' :
                            card.type === 'data' ? '批量' : '图片'
                          })`,
                        })),
                      ]}
                      placeholder="请选择卡券"
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">规格名称 <span className="text-gray-400 text-xs">(可选)</span></label>
                    <input
                      type="text"
                      value={bindingSpecName}
                      onChange={(e) => setBindingSpecName(e.target.value)}
                      className="input-ios"
                      placeholder="如: 颜色、尺寸、时长等"
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">规格值 <span className="text-gray-400 text-xs">(可选)</span></label>
                    <input
                      type="text"
                      value={bindingSpecValue}
                      onChange={(e) => setBindingSpecValue(e.target.value)}
                      className="input-ios"
                      placeholder="如: 红色、大号、月卡等"
                    />
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  提示：如果商品有多个规格，可以为每个规格创建独立的绑定；不填规格则作为通用绑定。
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={handleCloseBinding}
                className="btn-ios-secondary"
              >
                关闭
              </button>
              <button
                onClick={handleCreateBinding}
                className="btn-ios-primary"
                disabled={bindingSaving || !bindingCardId}
              >
                {bindingSaving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    保存中...
                  </span>
                ) : (
                  '添加绑定'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
