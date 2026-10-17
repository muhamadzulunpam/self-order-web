import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import { requestPayment } from '@/features/order/api'
import { ApiError } from '@/lib/api'
import { loadSnap } from './snap'
import type { SnapApi, SnapCallbacks } from './snap'
import { paymentErrorMessage, startPayment } from './startPayment'
import type { PaymentOutcome } from './startPayment'

vi.mock('@/features/order/api', () => ({
  createOrder: vi.fn(),
  fetchOrder: vi.fn(),
  requestPayment: vi.fn(),
}))

vi.mock('./snap', () => ({ loadSnap: vi.fn() }))

const mockRequest = vi.mocked(requestPayment)
const mockLoad = vi.mocked(loadSnap)

const session = {
  order_code: 'ORD-1',
  snap_token: 'snap-token-1',
  redirect_url: null,
  client_key: 'SB-Mid-client-x',
  is_production: false,
}

let pay: Mock<SnapApi['pay']>

const callbacks = (): SnapCallbacks => pay.mock.calls[0][1] ?? {}

beforeEach(() => {
  vi.clearAllMocks()
  pay = vi.fn<SnapApi['pay']>()
  mockRequest.mockResolvedValue(session)
  mockLoad.mockResolvedValue({ pay })
})

describe('startPayment', () => {
  it('meminta sesi pembayaran, memuat Snap dengan konfigurasi dari server, lalu membuka popup', async () => {
    await startPayment('abc123', 'ORD-1', vi.fn())

    expect(mockRequest).toHaveBeenCalledWith('abc123', 'ORD-1')
    expect(mockLoad).toHaveBeenCalledWith({
      clientKey: 'SB-Mid-client-x',
      isProduction: false,
    })
    expect(pay).toHaveBeenCalledWith('snap-token-1', expect.any(Object))
  })

  it.each<[keyof SnapCallbacks, PaymentOutcome]>([
    ['onSuccess', 'success'],
    ['onPending', 'pending'],
    ['onError', 'error'],
    ['onClose', 'closed'],
  ])('callback %s dipetakan ke hasil %s', async (name, outcome) => {
    const onDone = vi.fn()

    await startPayment('abc123', 'ORD-1', onDone)
    callbacks()[name]?.({})

    expect(onDone).toHaveBeenCalledWith(outcome)
  })

  it('memanggil onDone hanya satu kali walau beberapa callback menyala', async () => {
    const onDone = vi.fn()

    await startPayment('abc123', 'ORD-1', onDone)
    callbacks().onSuccess?.({})
    callbacks().onClose?.()

    expect(onDone).toHaveBeenCalledTimes(1)
    expect(onDone).toHaveBeenCalledWith('success')
  })

  it('meneruskan error dari server dan tidak membuka popup', async () => {
    mockRequest.mockRejectedValue(
      new ApiError(409, 'Pesanan ini tidak bisa dibayar.'),
    )

    await expect(startPayment('abc123', 'ORD-1', vi.fn())).rejects.toThrow(
      'Pesanan ini tidak bisa dibayar.',
    )

    expect(mockLoad).not.toHaveBeenCalled()
    expect(pay).not.toHaveBeenCalled()
  })

  it('meneruskan error jika skrip Snap gagal dimuat', async () => {
    mockLoad.mockRejectedValue(new Error('Gagal memuat halaman pembayaran.'))

    await expect(startPayment('abc123', 'ORD-1', vi.fn())).rejects.toThrow(
      /gagal memuat/i,
    )

    expect(pay).not.toHaveBeenCalled()
  })
})

describe('paymentErrorMessage', () => {
  it('memakai pesan dari error', () => {
    expect(paymentErrorMessage(new ApiError(502, 'Gateway bermasalah.'))).toBe(
      'Gateway bermasalah.',
    )

    expect(paymentErrorMessage(new Error('Skrip gagal.'))).toBe('Skrip gagal.')
  })

  it('memakai pesan umum untuk nilai yang bukan error', () => {
    expect(paymentErrorMessage('aneh')).toMatch(/belum bisa dibuka/i)
  })
})
