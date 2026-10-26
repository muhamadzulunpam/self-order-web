import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api'
import { describeStatusError } from './errors'

describe('describeStatusError', () => {
  it.each([
    [null, /belum terkirim/i, false],
    [401, /sesi anda telah berakhir/i, false],
    [403, /tidak berhak/i, false],
    [404, /tidak ditemukan/i, true],
    [409, /sudah diubah oleh staf lain/i, true],
    [422, /tidak valid/i, true],
    [429, /terlalu banyak permintaan/i, false],
    [500, /server sedang bermasalah/i, false],
    [503, /server sedang bermasalah/i, false],
  ])('status %s: pesan sesuai dan refresh=%s', (status, pattern, refresh) => {
    const failure = describeStatusError(new ApiError(status, 'x'))

    expect(failure.message).toMatch(pattern)
    expect(failure.refresh).toBe(refresh)
  })

  it('tidak menampilkan pesan bahasa Inggris dari server untuk 409 dan 403', () => {
    expect(
      describeStatusError(new ApiError(409, 'The order cannot be changed.'))
        .message,
    ).not.toMatch(/order|cannot/i)
    expect(
      describeStatusError(new ApiError(403, 'This action is unauthorized.'))
        .message,
    ).not.toMatch(/action|unauthorized/i)
  })

  it('memakai pesan server untuk status lain', () => {
    expect(describeStatusError(new ApiError(418, 'Aku teko.'))).toEqual({
      message: 'Aku teko.',
      refresh: false,
    })
  })

  it('memberi pesan umum untuk error yang bukan ApiError', () => {
    expect(describeStatusError(new Error('x')).message).toMatch(/tak terduga/i)
  })
})
