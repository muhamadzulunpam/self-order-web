import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { channelAuthorizer } from './channelAuthorizer'
import { createRealtime } from './realtimeClient'
import type { EchoLike, RealtimeClient } from './realtimeClient'

let instance: RealtimeClient | null | undefined

/** Dibuat sekali saat pertama dipakai. Mengembalikan null jika real-time tidak dikonfigurasi. */
export function getRealtime(): RealtimeClient | null {
  if (instance !== undefined) return instance

  const key = import.meta.env.VITE_REVERB_APP_KEY

  if (!key) {
    instance = null

    return instance
  }

  try {
    ;(window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher

    const secure = import.meta.env.VITE_REVERB_SCHEME === 'https'
    const port =
      Number(import.meta.env.VITE_REVERB_PORT) || (secure ? 443 : 8080)

    // `authorizer` tidak ada di tipe opsi Echo pada semua versi, tetapi diteruskan apa adanya ke pusher-js.
    const authOptions: object = { authorizer: channelAuthorizer }

    const echo = new Echo({
      broadcaster: 'reverb',
      key,
      wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
      wsPort: port,
      wssPort: port,
      forceTLS: secure,
      enabledTransports: ['ws', 'wss'],
      ...authOptions,
    })

    instance = createRealtime(echo as unknown as EchoLike)
  } catch {
    instance = null
  }

  return instance
}
