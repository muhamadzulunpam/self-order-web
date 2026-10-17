import { afterEach, describe, expect, it, vi } from 'vitest'

const SCRIPT_ID = 'midtrans-snap-script'

async function freshLoader() {
  vi.resetModules()

  return import('./snap')
}

const scripts = () => document.querySelectorAll(`script#${SCRIPT_ID}`)
const script = () => document.getElementById(SCRIPT_ID) as HTMLScriptElement

afterEach(() => {
  document.getElementById(SCRIPT_ID)?.remove()
  delete window.snap
})

describe('loadSnap', () => {
  it('memuat snap.js sandbox dengan client key dan selesai setelah skrip termuat', async () => {
    const { loadSnap } = await freshLoader()

    const promise = loadSnap({
      clientKey: 'SB-Mid-client-x',
      isProduction: false,
    })

    expect(script().src).toBe('https://app.sandbox.midtrans.com/snap/snap.js')
    expect(script().getAttribute('data-client-key')).toBe('SB-Mid-client-x')

    const snap = { pay: vi.fn() }
    window.snap = snap
    script().dispatchEvent(new Event('load'))

    await expect(promise).resolves.toBe(snap)
  })

  it('memakai URL production jika diminta', async () => {
    const { loadSnap } = await freshLoader()

    void loadSnap({ clientKey: 'Mid-client-x', isProduction: true })

    expect(script().src).toBe('https://app.midtrans.com/snap/snap.js')
  })

  it('tidak memasang skrip dua kali dan memakai promise yang sama', async () => {
    const { loadSnap } = await freshLoader()
    const options = { clientKey: 'SB-Mid-client-x', isProduction: false }

    const first = loadSnap(options)
    const second = loadSnap(options)

    expect(second).toBe(first)
    expect(scripts()).toHaveLength(1)
  })

  it('gagal jika skrip tidak bisa dimuat dan bisa dicoba lagi', async () => {
    const { loadSnap } = await freshLoader()
    const options = { clientKey: 'SB-Mid-client-x', isProduction: false }

    const first = loadSnap(options)
    script().dispatchEvent(new Event('error'))

    await expect(first).rejects.toThrow(/gagal memuat halaman pembayaran/i)

    const second = loadSnap(options)

    expect(second).not.toBe(first)
    expect(scripts()).toHaveLength(1)
  })

  it('gagal jika skrip termuat tetapi window.snap tidak ada', async () => {
    const { loadSnap } = await freshLoader()

    const promise = loadSnap({
      clientKey: 'SB-Mid-client-x',
      isProduction: false,
    })
    script().dispatchEvent(new Event('load'))

    await expect(promise).rejects.toThrow(/diinisialisasi/i)
  })
})
