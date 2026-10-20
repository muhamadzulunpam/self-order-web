import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { useCartStore } from '@/features/cart/store'
import { useActiveOrdersStore } from '@/features/order/activeOrdersStore'
import { getRealtime } from '@/lib/realtime'

vi.mock('@/lib/realtime', () => ({ getRealtime: vi.fn(() => null) }))

window.HTMLElement.prototype.scrollIntoView = () => {}

beforeEach(() => {
  vi.mocked(getRealtime).mockReturnValue(null)
})

afterEach(() => {
  cleanup()
  useCartStore.setState({ carts: {}, removedNotices: {} })
  useActiveOrdersStore.setState({ byToken: {} })
  localStorage.clear()
})
