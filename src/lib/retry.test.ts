import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api'
import { shouldRetry } from './retry'

describe('shouldRetry', () => {
  it('tidak mengulang untuk error klien', () => {
    for (const status of [404, 422, 429]) {
      expect(shouldRetry(0, new ApiError(status, 'x'))).toBe(false)
    }
  })

  it('mengulang untuk gangguan jaringan', () => {
    expect(shouldRetry(0, new ApiError(null, 'x'))).toBe(true)
  })

  it('mengulang untuk error server', () => {
    expect(shouldRetry(0, new ApiError(503, 'x'))).toBe(true)
  })

  it('berhenti setelah dua kali pengulangan', () => {
    expect(shouldRetry(2, new ApiError(503, 'x'))).toBe(false)
  })

  it('tidak mengulang untuk error non-API', () => {
    expect(shouldRetry(0, new Error('x'))).toBe(false)
  })
})
