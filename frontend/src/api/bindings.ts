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

// 获取商品SKU/规格信息
export interface SkuPropertyItem {
  propertyText: string   // 规格名称，如 "国家"
  valueText: string      // 规格值，如 "马来西亚"
  propertyId?: number
  valueId?: number
}

export interface SkuItem {
  sku_id: string
  spec_name: string       // 规格名称（单规格时）或组合（多规格用/分隔）
  spec_value: string      // 规格值（单规格时）或组合（多规格用/分隔）
  spec_text?: string      // 完整的规格文本，如 "国家:马来西亚"
  price: string           // 价格（元）
  stock: number           // 库存
  property_list?: SkuPropertyItem[]  // 原始属性列表（支持多规格）
}

export interface SkuInfo {
  item_id: string
  title: string
  has_sku: boolean
  sku_list: SkuItem[]
  spec_names: string[]                 // 所有规格名称，如 ["国家"]
  spec_values: Record<string, string[]> // 每个规格名对应的所有值，如 {"国家": ["马来西亚", "泰国", "其他国家"]}
}

export const getItemSkuInfo = async (cookieId: string, itemId: string): Promise<{ success: boolean; data?: SkuInfo; message?: string }> => {
  return get<{ success: boolean; data?: SkuInfo; message?: string }>(`/items/${cookieId}/${itemId}/sku`)
}

