import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api'
import { describeLoginError } from './errors'

describe('describeLoginError', () => {
  it.each([
    [null, /tidak dapat terhubung/i],
    [422, /email atau kata sandi salah/i],
    [429, /terlalu banyak percobaan/i],
    [500, /server sedang bermasalah/i],
    [503, /server sedang bermasalah/i],
  ])('memberi pesan yang sesuai untuk status %s', (status, pattern) => {
    expect(describeLoginError(new ApiError(status, 'x'))).toMatch(pattern)
  })

  it('tidak menampilkan pesan bahasa Inggris dari server untuk 422', () => {
    expect(
      describeLoginError(new ApiError(422, 'The given data was invalid.')),
    ).not.toMatch(/invalid|given/i)
  })

  it('memakai pesan dari server untuk status lain', () => {
    expect(describeLoginError(new ApiError(403, 'Dilarang.'))).toBe('Dilarang.')
  })

  it('memberi pesan umum untuk error yang bukan ApiError', () => {
    expect(describeLoginError(new Error('x'))).toMatch(/tak terduga/i)
  })
})
