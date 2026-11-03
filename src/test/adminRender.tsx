import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { signIn } from './auth'
import { mockServer } from './mockServer'
import type { Handler } from './mockServer'

/** Merender halaman admin sebagai admin yang sudah login, dengan server HTTP tiruan. */
export function renderAdmin(ui: ReactElement, routes: Record<string, Handler>) {
  signIn('admin')

  const server = mockServer(routes)
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const view = render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  )

  return { server, client, view, user: userEvent.setup() }
}
