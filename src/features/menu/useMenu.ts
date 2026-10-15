import { useQuery } from '@tanstack/react-query'
import { shouldRetry } from '@/lib/retry'
import { fetchTableMenu } from './api'

export function useMenu(token: string) {
  return useQuery({
    queryKey: ['menu', token],
    queryFn: () => fetchTableMenu(token),
    enabled: token !== '',
    retry: shouldRetry,
    refetchOnWindowFocus: true,
  })
}
