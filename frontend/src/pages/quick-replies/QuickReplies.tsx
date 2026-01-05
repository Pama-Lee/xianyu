import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, X, Zap, Loader2, FolderOpen, Tag } from 'lucide-react'
import { 
  getQuickReplies, getQuickReplyCategories, 
  createQuickReply, updateQuickReply, deleteQuickReply,
  type QuickReply 
} from '@/api/chat'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { PageLoading } from '@/components/common/Loading'

export function QuickReplies() {
  const { addToast } = useUIStore()
  const { isAuthenticated, token, _hasHydrated } = useAuthStore()
  
  const [loading, setLoading] = useState(true)
  const [replies, setReplies] = useState<QuickReply[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  
  // 弹窗状态
  const [showModal, setShowModal] = useState(false)
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '通用',
    sort_order: 0
  })
  const [saving, setSaving] = useState(false)

  const loadReplies = async () => {
    if (!_hasHydrated || !isAuthenticated || !token) return
    
    try {
      setLoading(true)
      const [repliesRes, categoriesRes] = await Promise.all([
        getQuickReplies(selectedCategory || undefined),
        getQuickReplyCategories()
      ])
      
      if (repliesRes.success) {
        setReplies(repliesRes.data)
      }
      if (categoriesRes.success) {
        setCategories(categoriesRes.data)
      }
    } catch {
      addToast({ type: 'error', message: '加载快捷回复失败' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReplies()
  }, [_hasHydrated, isAuthenticated, token, selectedCategory])

  const handleOpenModal = (reply?: QuickReply) => {
    if (reply) {
      setEditingReply(reply)
      setFormData({
        title: reply.title,
        content: reply.content,
        category: reply.category,
        sort_order: reply.sort_order
      })
    } else {
      setEditingReply(null)
      setFormData({
        title: '',
        content: '',
        category: selectedCategory || '通用',
        sort_order: 0
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingReply(null)
    setFormData({
      title: '',
      content: '',
      category: '通用',
      sort_order: 0
    })
  }

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      addToast({ type: 'warning', message: '请填写标题和内容' })
      return
    }

    setSaving(true)
    try {
      if (editingReply) {
        const result = await updateQuickReply(editingReply.id, formData)
        if (result.success) {
          addToast({ type: 'success', message: '更新成功' })
          handleCloseModal()
          loadReplies()
        } else {
          addToast({ type: 'error', message: result.message || '更新失败' })
        }
      } else {
        const result = await createQuickReply(formData)
        if (result.success) {
          addToast({ type: 'success', message: '创建成功' })
          handleCloseModal()
          loadReplies()
        } else {
          addToast({ type: 'error', message: result.message || '创建失败' })
        }
      }
    } catch {
      addToast({ type: 'error', message: '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (reply: QuickReply) => {
    if (!confirm(`确定要删除快捷回复"${reply.title}"吗？`)) return

    try {
      const result = await deleteQuickReply(reply.id)
      if (result.success) {
        addToast({ type: 'success', message: '删除成功' })
        loadReplies()
      } else {
        addToast({ type: 'error', message: result.message || '删除失败' })
      }
    } catch {
      addToast({ type: 'error', message: '删除失败' })
    }
  }

  // 按分类分组
  const groupedReplies = replies.reduce((acc, reply) => {
    const category = reply.category || '通用'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(reply)
    return acc
  }, {} as Record<string, QuickReply[]>)

  if (!_hasHydrated) {
    return <PageLoading />
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">快捷回复</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            管理常用回复模板，在聊天时快速使用
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          新建回复
        </button>
      </div>

      {/* 分类筛选 */}
      <div className="card-ios p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500 mr-2">分类:</span>
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              !selectedCategory 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            全部
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                selectedCategory === cat 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 快捷回复列表 */}
      <div className="card-ios">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : replies.length === 0 ? (
          <div className="text-center py-12">
            <Zap className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
            <p className="mt-4 text-gray-500 dark:text-gray-400">暂无快捷回复</p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-4 text-blue-500 hover:text-blue-600"
            >
              创建第一个快捷回复
            </button>
          </div>
        ) : selectedCategory ? (
          // 显示单个分类
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {replies.map((reply) => (
              <div
                key={reply.id}
                className="flex items-start justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {reply.title}
                    </span>
                    <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                      {reply.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {reply.content}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleOpenModal(reply)}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="编辑"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(reply)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // 按分类分组显示
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {Object.entries(groupedReplies).map(([category, items]) => (
              <div key={category} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FolderOpen className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">{category}</span>
                  <span className="text-xs text-gray-400">({items.length})</span>
                </div>
                <div className="grid gap-2">
                  {items.map((reply) => (
                    <div
                      key={reply.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                          {reply.title}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {reply.content}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-4">
                        <button
                          onClick={() => handleOpenModal(reply)}
                          className="p-1.5 text-gray-400 hover:text-blue-500 rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(reply)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 编辑/新建弹窗 */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-lg">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingReply ? '编辑快捷回复' : '新建快捷回复'}
              </h2>
              <button onClick={handleCloseModal} className="modal-close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="modal-body space-y-4">
              <div className="input-group">
                <label className="input-label">标题 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input-ios"
                  placeholder="简短的标题，方便识别"
                />
              </div>
              
              <div className="input-group">
                <label className="input-label">内容 <span className="text-red-500">*</span></label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="input-ios h-32 resize-none"
                  placeholder="回复的完整内容..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label className="input-label">分类</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input-ios"
                    placeholder="如：售前、售后、通用"
                    list="category-suggestions"
                  />
                  <datalist id="category-suggestions">
                    {categories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
                
                <div className="input-group">
                  <label className="input-label">排序</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    className="input-ios"
                    placeholder="数字越小越靠前"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn-ios-secondary"
                disabled={saving}
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="btn-ios-primary"
                disabled={saving}
              >
                {saving ? (
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
    </div>
  )
}

