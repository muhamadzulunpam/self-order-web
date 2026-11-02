import { useMemo } from 'react'
import { useCashierSound } from '@/features/kitchen/useCashierSound'
import { useStaffBoard } from '@/features/staff/useStaffBoard'
import { groupForCashier } from './cashierLogic'

export function useCashierBoard() {
  const sound = useCashierSound()
  const board = useStaffBoard({
    watch: 'ready',
    notify: sound.notify,
    keepRecent: true,
  })
  const groups = useMemo(() => groupForCashier(board.orders), [board.orders])

  return {
    ...board,
    ready: groups.ready,
    processing: groups.processing,
    sound,
  }
}
