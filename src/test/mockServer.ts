import { AxiosError } from 'axios'
import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import { api } from '@/lib/api'

export type Reply = { status: number; data?: unknown } | 'network-error'

export type RecordedCall = {
  method: string
  url: string
  authorization: string | null
  body: unknown
}

export type Handler = Reply | ((call: RecordedCall) => Reply | Promise<Reply>)

const originalAdapter = api.defaults.adapter

export function resetMockServer(): void {
  api.defaults.adapter = originalAdapter
}

/**
 * Mengganti adapter axios dengan server tiruan, sehingga interceptor dan parsing respons
 * ikut teruji. Kunci rute berbentuk "METHOD /path", misalnya "POST /auth/login".
 */
export function mockServer(routes: Record<string, Handler>) {
  const calls: RecordedCall[] = []

  const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    const method = (config.method ?? 'get').toUpperCase()
    const url = config.url ?? ''
    const authorization = config.headers.get('Authorization')

    const call: RecordedCall = {
      method,
      url,
      authorization: typeof authorization === 'string' ? authorization : null,
      body:
        typeof config.data === 'string'
          ? JSON.parse(config.data)
          : (config.data ?? null),
    }

    calls.push(call)

    const handler = routes[`${method} ${url}`]

    if (!handler) {
      throw new Error(`Tidak ada rute tiruan untuk ${method} ${url}`)
    }

    const reply = typeof handler === 'function' ? await handler(call) : handler

    if (reply === 'network-error') {
      throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config)
    }

    const response: AxiosResponse = {
      data: reply.data ?? {},
      status: reply.status,
      statusText: '',
      headers: {},
      config,
    }

    if (reply.status >= 200 && reply.status < 300) return response

    throw new AxiosError(
      `HTTP ${reply.status}`,
      AxiosError.ERR_BAD_RESPONSE,
      config,
      null,
      response,
    )
  }

  api.defaults.adapter = adapter

  return {
    calls,
    callsTo: (key: string) =>
      calls.filter((call) => `${call.method} ${call.url}` === key),
  }
}
