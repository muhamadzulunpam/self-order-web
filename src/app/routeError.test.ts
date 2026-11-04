import { describe, expect, it } from 'vitest'
import { isChunkError } from './routeError'

describe('isChunkError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://x/assets/KitchenPage-abc.js',
    'error loading dynamically imported module',
    'Importing a module script failed.',
    'Loading chunk 12 failed.',
  ])('mengenali "%s"', (message) => {
    expect(isChunkError(new Error(message))).toBe(true)
  })

  it('mengenali berdasarkan nama error', () => {
    const error = new Error('gagal')

    error.name = 'ChunkLoadError'

    expect(isChunkError(error)).toBe(true)
  })

  it('tidak mengenali error biasa atau nilai yang bukan Error', () => {
    expect(isChunkError(new Error('Cannot read properties of undefined'))).toBe(
      false,
    )
    expect(isChunkError('dynamically imported module')).toBe(false)
    expect(isChunkError(null)).toBe(false)
  })
})
