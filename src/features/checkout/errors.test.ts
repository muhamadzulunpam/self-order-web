import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api'
import { describeCheckoutError } from './errors'

describe('describeCheckoutError', () => {
  it('memetakan error item 422 ke indeks baris dan meminta muat ulang menu', () => {
    const result = describeCheckoutError(
      new ApiError(422, 'x', {
        'items.1.menu_id': ['Menu Es Teh sedang tidak tersedia.'],
        'items.0.spice_level': ['Level pedas wajib dipilih.'],
        'items.1.quantity': ['salah'],
      }),
    )

    expect(result.lineIndexes).toEqual([0, 1])
    expect(result.refreshMenu).toBe(true)
    expect(result.message).toMatch(/periksa kembali keranjang/i)
  })

  it('tidak menampilkan pesan bawaan server yang berbahasa Inggris', () => {
    const result = describeCheckoutError(
      new ApiError(422, 'The given data was invalid.', {
        'items.0.menu_id': ['The selected items.0.menu_id is invalid.'],
      }),
    )

    expect(result.message).not.toMatch(/selected|invalid/i)
  })

  it('memetakan error field nama dan catatan', () => {
    const result = describeCheckoutError(
      new ApiError(422, 'x', { customer_name: ['x'], notes: ['y'] }),
    )

    expect(result.fieldErrors.customer_name).toMatch(/maksimal 100/)
    expect(result.fieldErrors.notes).toMatch(/maksimal 500/)
    expect(result.lineIndexes).toEqual([])
    expect(result.refreshMenu).toBe(false)
  })

  it('memberi pesan umum untuk 422 yang tidak dikenal', () => {
    expect(
      describeCheckoutError(new ApiError(422, 'x', { items: ['x'] })).message,
    ).toMatch(/tidak valid/i)
  })

  it.each([
    [null, /belum terkirim/i],
    [404, /meja tidak ditemukan/i],
    [429, /terlalu banyak percobaan/i],
    [500, /server sedang bermasalah/i],
    [503, /server sedang bermasalah/i],
  ])('memberi pesan yang sesuai untuk status %s', (status, pattern) => {
    expect(describeCheckoutError(new ApiError(status, 'x')).message).toMatch(
      pattern,
    )
  })

  it('memakai pesan dari server untuk status lain', () => {
    expect(describeCheckoutError(new ApiError(409, 'Bentrok.')).message).toBe(
      'Bentrok.',
    )
  })

  it('memberi pesan umum untuk error yang bukan ApiError', () => {
    expect(describeCheckoutError(new Error('x')).message).toMatch(
      /tak terduga/i,
    )
  })
})
