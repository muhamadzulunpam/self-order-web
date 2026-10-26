import { api } from './api'

type AuthCallback = (error: Error | null, data: unknown) => void

/**
 * Otorisasi channel privat lewat klien API kita, sehingga Bearer token staf otomatis disisipkan
 * (token terbaru, tanpa perlu membuat ulang koneksi) dan 401 ikut ditangani interceptor.
 */
export function channelAuthorizer(channel: { name: string }) {
  return {
    authorize: (socketId: string, callback: AuthCallback) => {
      api
        .post('/broadcasting/auth', {
          socket_id: socketId,
          channel_name: channel.name,
        })
        .then((response) => callback(null, response.data))
        .catch((error: unknown) =>
          callback(
            error instanceof Error
              ? error
              : new Error('Otorisasi channel gagal.'),
            null,
          ),
        )
    },
  }
}
