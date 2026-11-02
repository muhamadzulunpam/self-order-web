import { useKitchenSoundStore } from './soundStore'
import { useStationSound } from './useStationSound'

export function useKitchenSound() {
  return useStationSound(useKitchenSoundStore)
}
