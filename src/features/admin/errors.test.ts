import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api'
import { describeAdminError } from './errors'

describe('describeAdminError', () => {
  it.each([
    [null, /belum terkirim/i, false],
    [401, /sesi anda telah berakhir/i, false],
    [403, /tidak berhak/i, false],
    [404, /tidak ditemukan/i, true],
    [413, /terlalu besar/i, false],
    [429, /terlalu banyak permintaan/i, false],
    [500, /server sedang bermasalah/i, false],
  ])('status %s: pesan sesuai dan refresh=%s', (status, pattern, refresh) => {
    const failure = describeAdminError(new ApiError(status, 'x'), 'menu')

    expect(failure.message).toMatch(pattern)
    expect(failure.refresh).toBe(refresh)
  })

  it.each([
    ['category', /masih memiliki menu/i],
    ['menu', /sudah pernah dipesan/i],
    ['table', /riwayat pesanan/i],
  ] as const)('409 untuk %s memakai pesan tersendiri', (entity, pattern) => {
    expect(describeAdminError(new ApiError(409, 'x'), entity).message).toMatch(
      pattern,
    )
  })

  it('tidak menampilkan pesan bahasa Inggris dari server', () => {
    const failure = describeAdminError(
      new ApiError(409, 'Menu has already been ordered.'),
      'menu',
    )

    expect(failure.message).not.toMatch(/ordered|already/i)
  })

  it('422: memetakan error per field dan mengenali nilai yang sudah dipakai', () => {
    const failure = describeAdminError(
      new ApiError(422, 'x', {
        name: ['The name has already been taken.'],
        number: ['The number has already been taken.'],
        image: ['The image must be a file of type: jpg.'],
        price: ['The price must be an integer.'],
        category_id: ['The selected category id is invalid.'],
      }),
      'menu',
    )

    expect(failure.fieldErrors).toEqual({
      name: 'Nama sudah dipakai.',
      number: 'Nomor meja sudah dipakai.',
      image: 'Gambar tidak valid. Gunakan JPG, PNG, atau WebP maksimal 2 MB.',
      price: 'Harga tidak valid.',
      category_id: 'Kategori tidak valid.',
    })
    expect(failure.message).toMatch(/periksa kembali/i)
  })

  it('422 dengan field tak dikenal memberi pesan umum', () => {
    const failure = describeAdminError(
      new ApiError(422, 'x', { aneh: ['salah'] }),
      'menu',
    )

    expect(failure.fieldErrors).toEqual({})
    expect(failure.message).toMatch(/tidak valid/i)
  })

  it('memakai pesan server untuk status lain dan pesan umum untuk error non-API', () => {
    expect(
      describeAdminError(new ApiError(418, 'Aku teko.'), 'menu').message,
    ).toBe('Aku teko.')
    expect(describeAdminError(new Error('x'), 'menu').message).toMatch(
      /tak terduga/i,
    )
  })
})
