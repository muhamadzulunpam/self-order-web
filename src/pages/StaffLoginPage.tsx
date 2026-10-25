import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { SessionLoading } from '@/features/auth/components/SessionStates'
import { describeLoginError } from '@/features/auth/errors'
import { safeRedirectPath } from '@/features/auth/roles'
import { useAuthStore } from '@/features/auth/store'
import { useSession } from '@/features/auth/useSession'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type FieldErrors = { email?: string; password?: string }

export function StaffLoginPage() {
  const { status, user } = useSession()
  const endReason = useAuthStore((state) => state.endReason)
  const login = useAuthStore((state) => state.login)
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const busyRef = useRef(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const emailId = useId()
  const passwordId = useId()

  if (status === 'idle' || status === 'checking') return <SessionLoading />

  if (status === 'authenticated' && user) {
    const from = (location.state as { from?: unknown } | null)?.from

    return <Navigate to={safeRedirectPath(from, user.role)} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (busyRef.current) return

    const trimmedEmail = email.trim()
    const errors: FieldErrors = {}

    if (!trimmedEmail) errors.email = 'Email wajib diisi.'
    else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      errors.email = 'Format email tidak valid.'
    }

    if (!password) errors.password = 'Kata sandi wajib diisi.'

    setFieldErrors(errors)
    setError(null)

    if (errors.email) {
      emailRef.current?.focus()
      return
    }

    if (errors.password) {
      passwordRef.current?.focus()
      return
    }

    busyRef.current = true
    setSubmitting(true)

    try {
      // Jika berhasil, store berubah menjadi authenticated dan halaman ini mengarahkan pergi.
      await login(trimmedEmail, password)
    } catch (err) {
      setError(describeLoginError(err))
      setPassword('')
      busyRef.current = false
      setSubmitting(false)
      passwordRef.current?.focus()
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Login Staf</h1>
        <p className="mt-1 text-sm text-stone-600">
          Masuk untuk mengelola pesanan.
        </p>
      </div>

      {endReason === 'expired' && !error && (
        <p
          role="status"
          className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
        >
          Sesi Anda telah berakhir. Silakan masuk lagi.
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor={emailId} className="mb-1 block text-sm font-semibold">
            Email
          </label>
          <input
            id={emailId}
            ref={emailRef}
            type="email"
            inputMode="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            readOnly={submitting}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={
              fieldErrors.email ? `${emailId}-error` : undefined
            }
            className="w-full rounded-xl border border-stone-300 p-3 text-sm focus:border-stone-900 focus:outline-none read-only:bg-stone-100"
          />
          {fieldErrors.email && (
            <p id={`${emailId}-error`} className="mt-1 text-sm text-red-600">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={passwordId}
            className="mb-1 block text-sm font-semibold"
          >
            Kata sandi
          </label>
          <input
            id={passwordId}
            ref={passwordRef}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            readOnly={submitting}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={
              fieldErrors.password ? `${passwordId}-error` : undefined
            }
            className="w-full rounded-xl border border-stone-300 p-3 text-sm focus:border-stone-900 focus:outline-none read-only:bg-stone-100"
          />
          {fieldErrors.password && (
            <p id={`${passwordId}-error`} className="mt-1 text-sm text-red-600">
              {fieldErrors.password}
            </p>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-stone-900 py-3.5 font-medium text-white active:bg-stone-700 disabled:bg-stone-300"
        >
          {submitting ? 'Memproses…' : 'Masuk'}
        </button>
      </form>

      <Link to="/" className="text-center text-sm text-stone-500 underline">
        ← Beranda
      </Link>
    </main>
  )
}
