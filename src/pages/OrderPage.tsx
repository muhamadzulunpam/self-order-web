import { useParams } from 'react-router-dom'

export function OrderPage() {
  const { token } = useParams<{ token: string }>()

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-bold">Menu</h1>
      <p className="mt-2 text-sm text-stone-600">Token meja: {token}</p>
    </main>
  )
}
