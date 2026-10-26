export type OrderStatus =
  'pending_payment' | 'paid' | 'preparing' | 'ready' | 'completed' | 'cancelled'

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'expired'

export type PublicOrderItem = {
  menu_name: string
  price: number
  quantity: number
  spice_level: number | null
  notes: string | null
  subtotal: number
}

export type PublicOrder = {
  order_code: string
  status: OrderStatus
  status_label: string
  payment_status: PaymentStatus | null
  table_number: number
  customer_name: string | null
  notes: string | null
  total_amount: number
  items: PublicOrderItem[]
  created_at: string
}

export type PaymentSession = {
  order_code: string
  snap_token: string
  redirect_url: string | null
  client_key: string
  is_production: boolean
}

export type OrderItemInput = {
  menu_id: number
  quantity: number
  spice_level?: number
  notes?: string
}

export type CreateOrderInput = {
  customer_name?: string
  notes?: string
  items: OrderItemInput[]
}

export type StaffOrderItem = {
  id: number
  menu_name: string
  quantity: number
  spice_level: number | null
  notes: string | null
}

export type StaffOrder = {
  id: number
  order_code: string
  status: OrderStatus
  status_label: string
  next_status: OrderStatus | null
  table_number: number
  customer_name: string | null
  notes: string | null
  total_amount: number
  items: StaffOrderItem[]
  paid_at: string | null
  created_at: string
}
