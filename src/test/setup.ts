import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { useCartStore } from '@/features/cart/store'
import {
  useCashierSoundStore,
  useKitchenSoundStore,
} from '@/features/kitchen/soundStore'
import { useActiveOrdersStore } from '@/features/order/activeOrdersStore'
import { getRealtime } from '@/lib/realtime'
import { resetMockServer } from '@/test/mockServer'

vi.mock('@/lib/realtime', () => ({ getRealtime: vi.fn(() => null) }))

// Layar staf dimuat lazy (code splitting): pemuatan pertama di test bisa lebih lama dari batas bawaan 1 detik.
configure({ asyncUtilTimeout: 4000 })

window.HTMLElement.prototype.scrollIntoView = () => {}
window.scrollTo = () => {}

beforeEach(() => {
  vi.mocked(getRealtime).mockReturnValue(null)
})

afterEach(() => {
  cleanup()
  resetMockServer()
  useCartStore.setState({ carts: {}, removedNotices: {} })
  useActiveOrdersStore.setState({ byToken: {} })
  useKitchenSoundStore.setState({ enabled: true })
  useCashierSoundStore.setState({ enabled: true })
  useAuthStore.setState({
    token: null,
    user: null,
    status: 'anonymous',
    endReason: null,
  })
  localStorage.clear()
})
