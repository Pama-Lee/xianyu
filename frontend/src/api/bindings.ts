import { get, post, put, del } from '@/utils/request'
import type { ItemCardBinding, ApiResponse } from '@/types'

// 获取所有绑定（可按账号筛选）
export const getAllBindings = async (cookieId?: string): Promise<{ success: boolean; data: ItemCardBinding[] }> => {
  const params = cookieId ? `?cookie_id=${cookieId}` : ''
  return get<{ success: boolean; data: ItemCardBinding[] }>(`/bindings${params}`)
}

// 获取商品的绑定列表
export const getItemBindings = async (cookieId: string, itemId: string): Promise<{ success: boolean; data: ItemCardBinding[] }> => {
  return get<{ success: boolean; data: ItemCardBinding[] }>(`/items/${cookieId}/${itemId}/bindings`)
}

// 为商品创建绑定
export const createBinding = async (
  cookieId: string,
  itemId: string,
  data: {
    card_id: number
    spec_name?: string
    spec_value?: string
    enabled?: boolean
    priority?: number
  }
): Promise<{ success: boolean; id?: number; message?: string }> => {
  return post<{ success: boolean; id?: number; message?: string }>(
    `/items/${cookieId}/${itemId}/bindings`,
    data
  )
}

// 更新绑定
export const updateBinding = async (
  bindingId: number,
  data: {
    card_id?: number
    spec_name?: string
    spec_value?: string
    enabled?: boolean
    priority?: number
  }
): Promise<ApiResponse> => {
  return put(`/bindings/${bindingId}`, data)
}

// 删除绑定
export const deleteBinding = async (bindingId: number): Promise<ApiResponse> => {
  return del(`/bindings/${bindingId}`)
}

// 获取绑定详情
export const getBindingDetail = async (bindingId: number): Promise<{ success: boolean; data: ItemCardBinding }> => {
  return get<{ success: boolean; data: ItemCardBinding }>(`/bindings/${bindingId}`)
}

