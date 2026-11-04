# Self-Order Web

![CI](https://github.com/USERNAME/self-order-web/actions/workflows/ci.yml/badge.svg)

Frontend sistem pemesanan mandiri untuk restoran. Pembeli memindai QR code di meja, memilih menu dari HP, membayar online lewat Midtrans, dan memantau pesanannya secara real-time. Dapur, kasir, dan admin punya layar kerja masing-masing.

Backend ada di repositori terpisah: [self-order-api](https://github.com/USERNAME/self-order-api) (Laravel).

**Demo:** https://GANTI-DENGAN-URL-DEMO

## Tampilan

| Menu | Keranjang | Status pesanan |
|------|-----------|----------------|
| ![Menu](docs/screenshots/menu.png) | ![Keranjang](docs/screenshots/keranjang.png) | ![Status](docs/screenshots/status.png) |

| Layar dapur | Layar kasir | Panel admin |
|-------------|-------------|-------------|
| ![Dapur](docs/screenshots/dapur.png) | ![Kasir](docs/screenshots/kasir.png) | ![Admin](docs/screenshots/admin.png) |

## Fitur

**Pembeli (tanpa login)**
- Buka `/order/:token` lewat QR code, menu tampil per kategori dengan navigasi cepat
- Keranjang dengan level pedas, catatan, dan jumlah. Tersimpan per meja, dan disinkronkan dengan menu terbaru (menu yang habis dibuang dari keranjang)
- Checkout, pembayaran lewat Midtrans Snap, dan halaman status dengan garis waktu yang diperbarui langsung
- Banner pesanan aktif di halaman menu, supaya pesanan mudah ditemukan lagi

**Staf (login, dibatasi per role)**
- Layar dapur: papan tiga kolom (Diterima, Dimasak, Siap diantar), pesanan baru masuk langsung disertai bunyi
- Layar kasir: pesanan siap diserahkan dengan konfirmasi dua langkah, daftar yang sedang diproses, dan yang baru selesai
- Panel admin: kelola kategori, menu (termasuk unggah gambar), dan meja (termasuk tampil dan unduh QR code, buat ulang token)

## Teknologi

React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Zustand, Axios, Laravel Echo (Reverb), Vitest, Testing Library, GitHub Actions.

## Keputusan teknis

- **Real-time dengan cadangan.** Pembaruan datang lewat WebSocket (Laravel Reverb), tetapi event hanya menjadi pemicu: data selalu diambil ulang dari API. Jika WebSocket putus atau tidak dikonfigurasi, polling mengambil alih secara otomatis.
- **Server adalah sumber kebenaran.** Harga dan total dihitung backend, dan status pembayaran hanya berubah lewat webhook Midtrans, bukan callback di browser.
- **Autentikasi token.** Token disimpan, pengguna dan role diambil ulang dari `/auth/me` setiap muat ulang, dan 401 mengakhiri sesi dengan aman. Data staf di cache dibersihkan saat logout atau pindah akun.
- **Tahan terhadap balapan.** Pada layar dapur dan kasir, kabar yang masuk saat data sedang dimuat tidak hilang, status tidak bisa mundur, dan satu aksi tidak terkirim dua kali.
- **Code splitting.** Layar staf dimuat saat dibutuhkan sehingga pembeli di HP tidak mengunduhnya.
- **Test mencakup alur nyata.** Test memakai server HTTP tiruan di level axios, jadi interceptor, parsing respons, store, dan halaman teruji bersama.

## Menjalankan secara lokal

Kebutuhan: Node.js 20.19+ atau 22.12+, dan backend [self-order-api](https://github.com/USERNAME/self-order-api) yang sudah berjalan.

```bash
git clone https://github.com/USERNAME/self-order-web.git
cd self-order-web
npm install
cp .env.example .env
npm run dev
```

Buka `http://localhost:5173`. Gunakan `localhost` (bukan `127.0.0.1`) agar cocok dengan pengaturan CORS backend. Untuk mencoba alur pembeli, ambil token meja dari backend (lihat README backend), lalu buka `/order/TOKEN`. Akun staf demo ada di README backend.

Variabel lingkungan (`.env`):

| Variabel | Keterangan |
|----------|------------|
| `VITE_API_URL` | Alamat API, misalnya `http://localhost:8000/api` |
| `VITE_REVERB_APP_KEY` | Kunci publik Reverb. Kosongkan untuk mematikan real-time |
| `VITE_REVERB_HOST`, `VITE_REVERB_PORT`, `VITE_REVERB_SCHEME` | Alamat server WebSocket |

Hanya kunci publik yang boleh masuk ke sini. `REVERB_APP_SECRET` tidak boleh disalin ke frontend.

## Skrip

| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Server pengembangan |
| `npm run build` | Cek tipe dan build produksi ke `dist/` |
| `npm run preview` | Menjalankan hasil build secara lokal |
| `npm test` | Menjalankan semua test |
| `npm run lint` | ESLint |
| `npm run typecheck` | Pemeriksaan tipe TypeScript |
| `npm run format` | Merapikan kode dengan Prettier |

## Struktur proyek

```
src/
  app/          rute, layout, halaman error, efek rute
  components/   komponen umum (BottomSheet, banner offline, dst.)
  features/     kode per fitur: menu, cart, checkout, order, payment,
                auth, kitchen, cashier, staff, admin
  lib/          klien API, real-time, format, helper
  pages/        halaman yang dipasang ke rute
  test/         helper test (server tiruan, fixture)
  types/        tipe data bersama
docs/           panduan deploy
```

## Testing

```bash
npm test
```

CI (GitHub Actions) menjalankan cek format, lint, cek tipe, test, dan build pada setiap push dan pull request.

## Deploy

Lihat [docs/DEPLOY.md](docs/DEPLOY.md) untuk panduan lengkap (frontend, API, WebSocket, Midtrans, dan HTTPS).