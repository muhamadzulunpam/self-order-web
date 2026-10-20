import type { OrderStatus } from '@/types/order'

export type StepState = 'done' | 'current' | 'upcoming'
export type TimelineStep = {
  status: OrderStatus
  label: string
  state: StepState
}

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'pending_payment', label: 'Pembayaran' },
  { status: 'paid', label: 'Diterima dapur' },
  { status: 'preparing', label: 'Dimasak' },
  { status: 'ready', label: 'Siap diantar' },
  { status: 'completed', label: 'Pesanan selesai' },
]

/** Pesanan yang dibatalkan tidak punya garis waktu. */
export function getTimeline(status: OrderStatus): TimelineStep[] | null {
  if (status === 'cancelled') return null

  const currentIndex = STEPS.findIndex((step) => step.status === status)

  return STEPS.map((step, index) => {
    let state: StepState = 'upcoming'

    if (status === 'completed' || index < currentIndex) state = 'done'
    else if (index === currentIndex) state = 'current'

    return { ...step, state }
  })
}
