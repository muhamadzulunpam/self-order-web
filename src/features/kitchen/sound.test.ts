import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type FakeOscillator = {
  type: string
  frequency: { value: number }
  connect: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = []
  static blockResume = false

  state: 'suspended' | 'running' = 'suspended'
  currentTime = 1
  destination = {}
  oscillators: FakeOscillator[] = []

  constructor() {
    FakeAudioContext.instances.push(this)
  }

  resume() {
    if (!FakeAudioContext.blockResume) this.state = 'running'

    return Promise.resolve()
  }

  createOscillator(): FakeOscillator {
    const oscillator: FakeOscillator = {
      type: '',
      frequency: { value: 0 },
      connect: vi.fn((node: unknown) => node),
      start: vi.fn(),
      stop: vi.fn(),
    }

    this.oscillators.push(oscillator)

    return oscillator
  }

  createGain() {
    return {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn((node: unknown) => node),
    }
  }
}

async function freshSound() {
  vi.resetModules()

  return import('./sound')
}

beforeEach(() => {
  FakeAudioContext.instances = []
  FakeAudioContext.blockResume = false
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sound tanpa dukungan AudioContext', () => {
  it('tidak ada suara dan tidak error', async () => {
    const { playNewOrderChime, unlockSound } = await freshSound()

    expect(playNewOrderChime()).toBe(false)
    await expect(unlockSound()).resolves.toBe(false)
  })
})

describe('sound dengan AudioContext', () => {
  beforeEach(() => {
    vi.stubGlobal('AudioContext', FakeAudioContext)
  })

  it('belum berbunyi sebelum kunci dibuka (context masih suspended)', async () => {
    const { playNewOrderChime } = await freshSound()

    expect(playNewOrderChime()).toBe(false)
    expect(FakeAudioContext.instances[0].oscillators).toHaveLength(0)
  })

  it('setelah dibuka, membunyikan dua nada naik', async () => {
    const { playNewOrderChime, unlockSound } = await freshSound()

    await expect(unlockSound()).resolves.toBe(true)
    expect(playNewOrderChime()).toBe(true)

    const [first, second] = FakeAudioContext.instances[0].oscillators

    expect(FakeAudioContext.instances[0].oscillators).toHaveLength(2)
    expect(first.frequency.value).toBe(880)
    expect(second.frequency.value).toBe(1175)
    expect(first.start).toHaveBeenCalledTimes(1)
    expect(second.stop).toHaveBeenCalledTimes(1)
  })

  it('gagal dibuka jika browser tetap menahan suara', async () => {
    FakeAudioContext.blockResume = true
    const { playNewOrderChime, unlockSound } = await freshSound()

    await expect(unlockSound()).resolves.toBe(false)
    expect(playNewOrderChime()).toBe(false)
  })

  it('memakai satu context untuk semua pemanggilan', async () => {
    const { playNewOrderChime, unlockSound } = await freshSound()

    await unlockSound()
    await unlockSound()
    playNewOrderChime()
    playNewOrderChime()

    expect(FakeAudioContext.instances).toHaveLength(1)
    expect(FakeAudioContext.instances[0].oscillators).toHaveLength(4)
  })
})
