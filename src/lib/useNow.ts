import { useEffect, useState } from 'react'

/** Waktu sekarang yang diperbarui berkala, untuk label seperti "5 menit lalu". */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)

    return () => clearInterval(timer)
  }, [intervalMs])

  return now
}
