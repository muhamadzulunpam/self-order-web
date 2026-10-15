import { ApiError } from '@/lib/api'

const MAX_RETRIES = 2

/**
 * Ulangi hanya untuk gangguan jaringan dan error server.
 * Error klien (404, 422, 429, dst.) tidak akan berubah kalau diulang.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false

  if (error instanceof ApiError) {
    return error.status === null || error.status >= 500
  }

  return false
}
