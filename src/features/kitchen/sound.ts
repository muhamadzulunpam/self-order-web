type AudioContextConstructor = typeof AudioContext

let context: AudioContext | null = null

function getContext(): AudioContext | null {
  if (context) return context

  const scope = window as unknown as {
    AudioContext?: AudioContextConstructor
    webkitAudioContext?: AudioContextConstructor
  }
  const Constructor = scope.AudioContext ?? scope.webkitAudioContext

  if (!Constructor) return null

  try {
    context = new Constructor()
  } catch {
    return null
  }

  return context
}

/** Browser hanya mengizinkan suara setelah ada interaksi pengguna. Panggil ini dari klik atau sentuhan. */
export async function unlockSound(): Promise<boolean> {
  const audio = getContext()

  if (!audio) return false

  if (audio.state === 'suspended') {
    try {
      await audio.resume()
    } catch {
      return false
    }
  }

  return audio.state === 'running'
}

const NOTES = [
  { frequency: 880, at: 0 },
  { frequency: 1175, at: 0.18 },
]

/** Dua nada pendek naik. Mengembalikan false jika suara tidak bisa diputar (belum ada interaksi atau tidak didukung). */
export function playNewOrderChime(): boolean {
  const audio = getContext()

  if (!audio || audio.state !== 'running') return false

  const start = audio.currentTime

  for (const note of NOTES) {
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    const from = start + note.at

    oscillator.type = 'sine'
    oscillator.frequency.value = note.frequency
    gain.gain.setValueAtTime(0.0001, from)
    gain.gain.exponentialRampToValueAtTime(0.3, from + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, from + 0.3)
    oscillator.connect(gain).connect(audio.destination)
    oscillator.start(from)
    oscillator.stop(from + 0.32)
  }

  return true
}
