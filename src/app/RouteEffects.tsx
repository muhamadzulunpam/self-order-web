import { useEffect } from 'react'
import { useLocation, useMatches } from 'react-router-dom'
import { documentTitle, titleFromMatches } from './routeMeta'

/** Efek di tingkat rute: judul tab mengikuti halaman, dan halaman digulir ke atas setiap pindah halaman. */
export function RouteEffects() {
  const matches = useMatches()
  const { pathname } = useLocation()
  const title = documentTitle(titleFromMatches(matches))

  useEffect(() => {
    document.title = title
  }, [title])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
