export type ConfigInput = {
  apiUrl: string | undefined
  reverbKey: string | undefined
  reverbHost: string | undefined
  reverbScheme: string | undefined
  pageProtocol: string
}

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]']

function parseUrl(value: string): URL | null {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

/** Mengembalikan daftar masalah konfigurasi yang pasti salah. Daftar kosong berarti aman. */
export function validateConfig(input: ConfigInput): string[] {
  const problems: string[] = []
  const apiUrl = input.apiUrl?.trim()

  if (!apiUrl) {
    problems.push(
      'VITE_API_URL belum diisi. Isi dengan alamat API, misalnya https://api.contoh.com/api.',
    )
  } else {
    const url = parseUrl(apiUrl)

    if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
      problems.push(
        'VITE_API_URL harus berupa alamat lengkap yang diawali http:// atau https://.',
      )
    } else if (
      input.pageProtocol === 'https:' &&
      url.protocol === 'http:' &&
      !LOCAL_HOSTS.includes(url.hostname)
    ) {
      problems.push(
        'Halaman ini memakai HTTPS tetapi VITE_API_URL memakai HTTP, sehingga browser akan memblokir permintaannya (mixed content). Gunakan alamat HTTPS.',
      )
    }
  }

  if (input.reverbKey) {
    const host = input.reverbHost?.trim()

    if (!host) {
      problems.push(
        'VITE_REVERB_HOST belum diisi padahal VITE_REVERB_APP_KEY sudah diisi.',
      )
    } else if (
      input.pageProtocol === 'https:' &&
      input.reverbScheme !== 'https' &&
      !LOCAL_HOSTS.includes(host)
    ) {
      problems.push(
        'Halaman ini memakai HTTPS, jadi VITE_REVERB_SCHEME harus https agar koneksi WebSocket tidak diblokir.',
      )
    }
  }

  return problems
}
