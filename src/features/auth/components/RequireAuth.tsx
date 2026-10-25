import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store'
import type { Role } from '../types'
import { useSession } from '../useSession'
import { ForbiddenState, SessionError, SessionLoading } from './SessionStates'

type Props = { roles?: readonly Role[] }

export function RequireAuth({ roles }: Props) {
  const { status, user, retry } = useSession()
  const endReason = useAuthStore((state) => state.endReason)
  const location = useLocation()

  if (status === 'idle' || status === 'checking') return <SessionLoading />

  if (status === 'error') return <SessionError onRetry={() => void retry()} />

  if (status === 'anonymous' || !user) {
    // Setelah logout sengaja, jangan ingat halaman terakhir.
    const state =
      endReason === 'logout'
        ? undefined
        : { from: location.pathname + location.search }

    return <Navigate to="/staff/login" replace state={state} />
  }

  if (roles && !roles.includes(user.role))
    return <ForbiddenState role={user.role} />

  return <Outlet />
}
