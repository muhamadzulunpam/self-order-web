import { describe, expect, it } from 'vitest'
import { validateConfig } from './config'
import type { ConfigInput } from './config'

const good: ConfigInput = {
  apiUrl: 'https://api.contoh.com/api',
  reverbKey: 'kunci',
  reverbHost: 'ws.contoh.com',
  reverbScheme: 'https',
  pageProtocol: 'https:',
}

describe('validateConfig', () => {
  it('tidak ada masalah untuk konfigurasi produksi yang benar', () => {
    expect(validateConfig(good)).toEqual([])
  })

  it('tidak ada masalah untuk konfigurasi lokal dan real-time yang dimatikan', () => {
    expect(
      validateConfig({
        apiUrl: 'http://localhost:8000/api',
        reverbKey: '',
        reverbHost: 'localhost',
        reverbScheme: 'http',
        pageProtocol: 'http:',
      }),
    ).toEqual([])
  })

  it('melaporkan VITE_API_URL yang kosong', () => {
    for (const apiUrl of [undefined, '', '   ']) {
      expect(validateConfig({ ...good, apiUrl })).toEqual([
        expect.stringMatching(/VITE_API_URL belum diisi/),
      ])
    }
  })

  it('melaporkan VITE_API_URL yang bukan alamat lengkap', () => {
    for (const apiUrl of [
      'api.contoh.com/api',
      'ftp://contoh.com',
      'bukan url',
    ]) {
      expect(validateConfig({ ...good, apiUrl })).toEqual([
        expect.stringMatching(/alamat lengkap/),
      ])
    }
  })

  it('melaporkan mixed content: halaman HTTPS memanggil API HTTP', () => {
    expect(
      validateConfig({ ...good, apiUrl: 'http://api.contoh.com/api' }),
    ).toEqual([expect.stringMatching(/mixed content/)])
  })

  it('API HTTP ke localhost dari halaman HTTPS tidak dianggap masalah', () => {
    expect(
      validateConfig({ ...good, apiUrl: 'http://localhost:8000/api' }),
    ).toEqual([])
  })

  it('halaman HTTP dengan API HTTP aman', () => {
    expect(
      validateConfig({
        ...good,
        apiUrl: 'http://192.168.1.5:8000/api',
        reverbScheme: 'http',
        pageProtocol: 'http:',
      }),
    ).toEqual([])
  })

  it('melaporkan host Reverb yang kosong saat kunci diisi', () => {
    expect(validateConfig({ ...good, reverbHost: '' })).toEqual([
      expect.stringMatching(/VITE_REVERB_HOST/),
    ])
  })

  it('melaporkan skema Reverb yang bukan https pada halaman HTTPS', () => {
    expect(validateConfig({ ...good, reverbScheme: 'http' })).toEqual([
      expect.stringMatching(/VITE_REVERB_SCHEME/),
    ])
    expect(
      validateConfig({
        ...good,
        reverbHost: 'localhost',
        reverbScheme: 'http',
      }),
    ).toEqual([])
  })

  it('tanpa kunci Reverb, pengaturan Reverb lain tidak diperiksa', () => {
    expect(
      validateConfig({
        ...good,
        reverbKey: '',
        reverbHost: '',
        reverbScheme: 'http',
      }),
    ).toEqual([])
  })

  it('mengumpulkan beberapa masalah sekaligus', () => {
    expect(
      validateConfig({ ...good, apiUrl: undefined, reverbHost: undefined }),
    ).toHaveLength(2)
  })
})
