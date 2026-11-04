import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { OnlineBanner } from './OnlineBanner'

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true })
  window.dispatchEvent(new Event(value ? 'online' : 'offline'))
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'onLine')
})

describe('OnlineBanner', () => {
  it('tidak menampilkan apa pun saat online', () => {
    render(<OnlineBanner />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('muncul saat koneksi putus dan hilang saat kembali', () => {
    render(<OnlineBanner />)

    act(() => setOnline(false))

    expect(screen.getByRole('status')).toHaveTextContent(/sedang offline/i)

    act(() => setOnline(true))

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('langsung tampil jika sudah offline saat dimuat', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    })

    render(<OnlineBanner />)

    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
