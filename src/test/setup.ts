import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { useCartStore } from '@/features/cart/store'

window.HTMLElement.prototype.scrollIntoView = () => {}

afterEach(() => {
  cleanup()
  useCartStore.setState({ carts: {}, removedNotices: {} })
  localStorage.clear()
})
