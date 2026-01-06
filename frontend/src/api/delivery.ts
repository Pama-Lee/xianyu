import { post } from './index'

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
export const testDelivery = async (data: TestDeliveryRequest): Promise<TestDeliveryResponse> => {
  return post<TestDeliveryResponse>('/api/test-delivery', data)
}
