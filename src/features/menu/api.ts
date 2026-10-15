import { api } from '@/lib/api'
import type { TableMenu } from '@/types/menu'

export async function fetchTableMenu(token: string): Promise<TableMenu> {
  const { data } = await api.get<{ data: TableMenu }>(
    `/public/tables/${encodeURIComponent(token)}/menu`,
  )

  return data.data
}
