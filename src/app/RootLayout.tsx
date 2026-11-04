import { Outlet } from 'react-router-dom'
import { OnlineBanner } from '@/components/OnlineBanner'
import { RouteEffects } from './RouteEffects'

export function RootLayout() {
  return (
    <>
      <OnlineBanner />
      <RouteEffects />
      <Outlet />
    </>
  )
}
