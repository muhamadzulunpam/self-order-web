import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { Providers } from '@/app/providers'
import { routes } from '@/app/routes'
import { ConfigErrorPage } from '@/components/ConfigErrorPage'
import { validateConfig } from '@/lib/config'
import './index.css'

const problems = validateConfig({
  apiUrl: import.meta.env.VITE_API_URL,
  reverbKey: import.meta.env.VITE_REVERB_APP_KEY,
  reverbHost: import.meta.env.VITE_REVERB_HOST,
  reverbScheme: import.meta.env.VITE_REVERB_SCHEME,
  pageProtocol: window.location.protocol,
})

const router = problems.length === 0 ? createBrowserRouter(routes) : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {router ? (
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    ) : (
      <ConfigErrorPage problems={problems} />
    )}
  </StrictMode>,
)
