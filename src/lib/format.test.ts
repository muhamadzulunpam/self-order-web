import { describe, expect, it } from 'vitest'
import { formatRupiah } from './format'

describe('formatRupiah', () => {
  it('memformat angka sebagai Rupiah tanpa desimal', () => {
    expect(formatRupiah(12000).replace(/\s/g, ' ')).toBe('Rp 12.000')
  })

  it('memformat angka besar dengan pemisah ribuan', () => {
    expect(formatRupiah(1250000).replace(/\s/g, ' ')).toBe('Rp 1.250.000')
  })

  it('memformat nol', () => {
    expect(formatRupiah(0).replace(/\s/g, ' ')).toBe('Rp 0')
  })
})
