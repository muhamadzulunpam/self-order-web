import { useCashierSoundStore } from './soundStore'
import { useStationSound } from './useStationSound'

export function useCashierSound() {
  return useStationSound(useCashierSoundStore)
}
