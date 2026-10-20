import type { OrderStatus } from '@/types/order'

export const STATUS_STYLE: Record<OrderStatus, string> = {
  pending_payment: 'bg-amber-50 text-amber-900',
  paid: 'bg-sky-50 text-sky-900',
  preparing: 'bg-sky-50 text-sky-900',
  ready: 'bg-emerald-50 text-emerald-900',
  completed: 'bg-emerald-50 text-emerald-900',
  cancelled: 'bg-stone-100 text-stone-700',
}

export const STATUS_HINT: Record<OrderStatus, string> = {
  pending_payment: 'Selesaikan pembayaran agar pesanan diteruskan ke dapur.',
  paid: 'Pembayaran diterima. Pesanan Anda segera diproses dapur.',
  preparing: 'Pesanan Anda sedang dimasak.',
  ready: 'Pesanan Anda sudah siap. Silakan tunggu diantar ke meja.',
  completed: 'Pesanan selesai. Terima kasih!',
  cancelled:
    'Pesanan dibatalkan karena pembayaran gagal atau kedaluwarsa. Silakan buat pesanan baru.',
}

export function isFinalStatus(status: OrderStatus): boolean {
  return status === 'completed' || status === 'cancelled'
}
