import { describe, expect, it } from 'vitest'
import { getTimeline } from './timeline'

const states = (status: Parameters<typeof getTimeline>[0]) =>
  getTimeline(status)?.map((step) => step.state)

describe('getTimeline', () => {
  it('urutan langkah dari pembayaran sampai selesai', () => {
    expect(getTimeline('paid')?.map((step) => step.label)).toEqual([
      'Pembayaran',
      'Diterima dapur',
      'Dimasak',
      'Siap diantar',
      'Pesanan selesai',
    ])
  })

  it('menunggu pembayaran: langkah pertama berlangsung', () => {
    expect(states('pending_payment')).toEqual([
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
    ])
  })

  it('sudah dibayar: pembayaran selesai, diterima dapur berlangsung', () => {
    expect(states('paid')).toEqual([
      'done',
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
    ])
  })

  it('sedang dimasak', () => {
    expect(states('preparing')).toEqual([
      'done',
      'done',
      'current',
      'upcoming',
      'upcoming',
    ])
  })

  it('siap diantar', () => {
    expect(states('ready')).toEqual([
      'done',
      'done',
      'done',
      'current',
      'upcoming',
    ])
  })

  it('selesai: semua langkah selesai', () => {
    expect(states('completed')).toEqual([
      'done',
      'done',
      'done',
      'done',
      'done',
    ])
  })

  it('dibatalkan: tidak ada garis waktu', () => {
    expect(getTimeline('cancelled')).toBeNull()
  })
})
