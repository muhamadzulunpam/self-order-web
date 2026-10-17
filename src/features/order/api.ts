import { api } from '@/lib/api'
import type {
  CreateOrderInput,
  PaymentSession,
  PublicOrder,
} from '@/types/order'

function tablePath(token: string): string {
  return `/public/tables/${encodeURIComponent(token)}`
}

function orderUrl(token: string, orderCode: string): string {
  return `${tablePath(token)}/orders/${encodeURIComponent(orderCode)}`
}

export async function createOrder(
  token: string,
  input: CreateOrderInput,
): Promise<PublicOrder> {
  const { data } = await api.post<{ data: PublicOrder }>(
    `${tablePath(token)}/orders`,
    input,
  )

  return data.data
}

export async function fetchOrder(
  token: string,
  orderCode: string,
): Promise<PublicOrder> {
  const { data } = await api.get<{ data: PublicOrder }>(
    orderUrl(token, orderCode),
  )

  return data.data
}

/** Timeout lebih panjang karena server memanggil Midtrans (hingga 15 detik) di dalam request ini. */
export async function requestPayment(
  token: string,
  orderCode: string,
): Promise<PaymentSession> {
  const { data } = await api.post<{ data: PaymentSession }>(
    `${orderUrl(token, orderCode)}/pay`,
    undefined,
    { timeout: 30_000 },
  )

  return data.data
}
