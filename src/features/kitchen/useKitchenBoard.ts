import { useMemo } from 'react'
import { useStaffBoard } from '@/features/staff/useStaffBoard'
import { groupByColumn } from './boardLogic'
import { useKitchenSound } from './useKitchenSound'

export function useKitchenBoard() {
  const sound = useKitchenSound()
  const board = useStaffBoard({ watch: 'paid', notify: sound.notify })
  const columns = useMemo(() => groupByColumn(board.orders), [board.orders])

  return {
    ...board,
    columns,
    total:
      columns.paid.length + columns.preparing.length + columns.ready.length,
    sound,
  }
}
