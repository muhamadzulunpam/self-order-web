export function ConfigErrorPage({ problems }: { problems: string[] }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-bold">Konfigurasi aplikasi belum lengkap</h1>

      <ul
        role="alert"
        className="list-disc space-y-2 pl-5 text-sm text-stone-700"
      >
        {problems.map((problem) => (
          <li key={problem}>{problem}</li>
        ))}
      </ul>

      <p className="text-sm text-stone-500">
        Perbaiki variabel lingkungan (.env), lalu bangun ulang aplikasi dengan
        npm run build.
      </p>
    </main>
  )
}
