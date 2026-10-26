import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { useCartStore } from '@/features/cart/store'
import { useKitchenSoundStore } from '@/features/kitchen/soundStore'
import { useActiveOrdersStore } from '@/features/order/activeOrdersStore'
import { getRealtime } from '@/lib/realtime'
import { resetMockServer } from '@/test/mockServer'

vi.mock('@/lib/realtime', () => ({ getRealtime: vi.fn(() => null) }))

window.HTMLElement.prototype.scrollIntoView = () => {}

beforeEach(() => {
  vi.mocked(getRealtime).mockReturnValue(null)
})

afterEach(() => {
  cleanup()
  resetMockServer()
  useCartStore.setState({ carts: {}, removedNotices: {} })
  useActiveOrdersStore.setState({ byToken: {} })
  useKitchenSoundStore.setState({ enabled: true })
  useAuthStore.setState({
    token: null,
    user: null,
    status: 'anonymous',
    endReason: null,
  })
  localStorage.clear()
})
