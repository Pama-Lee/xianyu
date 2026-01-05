import { get, post, put, del } from '@/utils/request'

// 买家相关类型
export interface Buyer {
  id: number
  cookie_id: string
  buyer_id: string
  buyer_name: string | null
  buyer_avatar: string | null
  last_message: string | null
  last_message_time: string | null
  unread_count: number
  total_orders: number
  tags: string[]
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BuyerListResponse {
  success: boolean
  buyers: Buyer[]
  total: number
  page: number
  page_size: number
}

// 会话类型（按买家+商品分组）
export interface ChatSession {
  id: string  // buyer_id + "_" + item_id
  cookie_id: string
  buyer_id: string
  buyer_name: string | null
  buyer_avatar: string | null
  item_id: string | null
  item_title: string | null
  item_image: string | null
  chat_id: string
  last_message: string | null
  last_message_time: string | null
  unread_count: number
}

export interface ChatSessionListResponse {
  success: boolean
  sessions: ChatSession[]
  total: number
}

// 聊天消息类型
export interface ChatMessage {
  id: number
  cookie_id: string
  chat_id: string
  buyer_id: string
  item_id: string | null
  sender_type: 'buyer' | 'seller'
  message_type: 'text' | 'image' | 'card' | 'order'
  content: string
  image_url: string | null
  is_read: boolean
  created_at: string
}

export interface ChatMessagesResponse {
  success: boolean
  messages: ChatMessage[]
  total: number
  has_more: boolean
}

// 快捷回复类型
export interface QuickReply {
  id: number
  user_id: number
  category: string
  title: string
  content: string
  sort_order: number
  created_at: string
}

// 买家 API
export const getBuyers = async (params?: {
  cookie_id?: string
  search?: string
  page?: number
  page_size?: number
}): Promise<BuyerListResponse> => {
  const queryParams = new URLSearchParams()
  if (params?.cookie_id) queryParams.append('cookie_id', params.cookie_id)
  if (params?.search) queryParams.append('search', params.search)
  if (params?.page) queryParams.append('page', String(params.page))
  if (params?.page_size) queryParams.append('page_size', String(params.page_size))
  
  const query = queryParams.toString()
  return get<BuyerListResponse>(`/buyers${query ? `?${query}` : ''}`)
}

export const getBuyerDetail = async (cookieId: string, buyerId: string): Promise<{ success: boolean; data: Buyer }> => {
  return get<{ success: boolean; data: Buyer }>(`/buyers/${cookieId}/${buyerId}`)
}

export const updateBuyer = async (
  cookieId: string,
  buyerId: string,
  data: { tags?: string[]; notes?: string }
): Promise<{ success: boolean; message: string }> => {
  return put(`/buyers/${cookieId}/${buyerId}`, data)
}

// 会话列表 API（按买家+商品分组）
export const getChatSessions = async (cookieId: string): Promise<ChatSessionListResponse> => {
  return get<ChatSessionListResponse>(`/chat/sessions/${cookieId}`)
}

// 聊天消息 API
export const getChatMessages = async (
  cookieId: string,
  buyerId: string,
  params?: { page?: number; page_size?: number; before_id?: number }
): Promise<ChatMessagesResponse> => {
  const queryParams = new URLSearchParams()
  if (params?.page) queryParams.append('page', String(params.page))
  if (params?.page_size) queryParams.append('page_size', String(params.page_size))
  if (params?.before_id) queryParams.append('before_id', String(params.before_id))
  
  const query = queryParams.toString()
  return get<ChatMessagesResponse>(`/chat/${cookieId}/${buyerId}/messages${query ? `?${query}` : ''}`)
}

export const sendChatMessage = async (
  cookieId: string,
  buyerId: string,
  data: { message: string; message_type?: string; image_url?: string; chat_id?: string; item_id?: string }
): Promise<{ success: boolean; message: string }> => {
  return post(`/chat/${cookieId}/${buyerId}/send`, data)
}

export const markMessagesRead = async (
  cookieId: string,
  buyerId: string
): Promise<{ success: boolean; marked_count: number }> => {
  return post(`/chat/${cookieId}/${buyerId}/read`, {})
}

// 快捷回复 API
export const getQuickReplies = async (category?: string): Promise<{ success: boolean; data: QuickReply[] }> => {
  const query = category ? `?category=${encodeURIComponent(category)}` : ''
  return get<{ success: boolean; data: QuickReply[] }>(`/quick-replies${query}`)
}

export const getQuickReplyCategories = async (): Promise<{ success: boolean; data: string[] }> => {
  return get<{ success: boolean; data: string[] }>('/quick-replies/categories')
}

export const createQuickReply = async (data: {
  title: string
  content: string
  category?: string
  sort_order?: number
}): Promise<{ success: boolean; id: number; message: string }> => {
  return post('/quick-replies', data)
}

export const updateQuickReply = async (
  replyId: number,
  data: { title?: string; content?: string; category?: string; sort_order?: number }
): Promise<{ success: boolean; message: string }> => {
  return put(`/quick-replies/${replyId}`, data)
}

export const deleteQuickReply = async (replyId: number): Promise<{ success: boolean; message: string }> => {
  return del(`/quick-replies/${replyId}`)
}

