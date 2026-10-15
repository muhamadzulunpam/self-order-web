// src/pages/OrderPage.tsx
import { useParams } from 'react-router-dom'
import { MenuSkeleton } from '@/features/menu/components/MenuSkeleton'
import {
  InvalidTableState,
  MenuErrorState,
} from '@/features/menu/components/MenuStates'
import { MenuView } from '@/features/menu/components/MenuView'
import { useMenu } from '@/features/menu/useMenu'
import { ApiError } from '@/lib/api'

export function OrderPage() {
  const { token = '' } = useParams<{ token: string }>()
  const menu = useMenu(token)

  if (token === '') return <InvalidTableState />
  if (menu.isPending) return <MenuSkeleton />

  if (menu.isError) {
    if (menu.error instanceof ApiError && menu.error.status === 404) {
      return <InvalidTableState />
    }

    const message =
      menu.error instanceof ApiError
        ? menu.error.message
        : 'Terjadi kesalahan saat memuat menu.'

    return <MenuErrorState message={message} onRetry={() => menu.refetch()} />
  }

  return <MenuView data={menu.data} />
}
