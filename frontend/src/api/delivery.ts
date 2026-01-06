import { get, post, put, del } from '@/utils/request'
import type { ApiResponse } from '@/types'

// ==================== 测试发货 ====================

export interface TestDeliveryRequest {
  cookie_id: string
  order_id: string
  test_message?: string
}

export interface TestDeliveryResponse {
  success: boolean
  message: string
  triggered?: boolean
  order_info?: {
    order_id: string
    item_title: string
    buyer_nick: string
    status: string
    order_detail: any
  }
}

/**
 * 测试自动发货
 */
export const testDelivery = (data: TestDeliveryRequest): Promise<TestDeliveryResponse> => {
  return post('/api/test-delivery', data)
}

// ==================== 发货规则管理 ====================

export interface DeliveryRuleData {
  keyword: string
  card_id: number
  description?: string
  enabled?: boolean
}

/**
 * 获取发货规则列表
 */
export const getDeliveryRules = async (): Promise<{ success: boolean; data: any[] }> => {
  try {
    const data = await get<any[]>('/delivery-rules')
    return { success: true, data: data || [] }
  } catch {
    return { success: false, data: [] }
  }
}

/**
 * 创建发货规则
 */
export const addDeliveryRule = (data: DeliveryRuleData): Promise<ApiResponse> => {
  return post('/delivery-rules', data)
}

/**
 * 更新发货规则
 */
export const updateDeliveryRule = (ruleId: number, data: Partial<DeliveryRuleData>): Promise<ApiResponse> => {
  return put(`/delivery-rules/${ruleId}`, data)
}

/**
 * 删除发货规则
 */
export const deleteDeliveryRule = (ruleId: number): Promise<ApiResponse> => {
  return del(`/delivery-rules/${ruleId}`)
}
