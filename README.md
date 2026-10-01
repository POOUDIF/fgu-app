# Festival Generasi Unggul (FGU) 3.0

Aplikasi web FGU 3.0: pendaftaran peserta per desa, jenis mata lomba, penilaian juri,
dashboard live untuk Admin Daerah, dan hasil/pemenang. Next.js 16 (App Router) + Supabase.

## Peran
| Peran | Halaman | Bisa apa |
|---|---|---|
| Publik | `/`, `/lomba/[slug]` | Lihat lomba, kriteria, pemenang (setelah dipublikasikan) |
| Admin Desa | `/desa` | Kelola peserta desanya, daftarkan lomba, lihat hasil desanya |
| Juri | `/juri` | Menilai peserta di lomba yang ditugaskan (nilai terkunci setelah dikirim) |
| Admin Daerah | `/admin` | Dashboard live, rekap peserta, penalti, publikasi hasil, akun & penugasan juri, jadwal |

Semua aturan juknis (jenjang, kelas SD, batas usia, gender, slot, kuota per desa, satu peserta satu
lomba, jadwal pendaftaran) ditegakkan **di database** (trigger + RLS), bukan hanya di tampilan.

## Setup
1. Di Supabase SQL Editor jalankan berurutan: `fgu_01_schema.sql`, `fgu_02_seed.sql`, `fgu_03_profile_email.sql`.
2. Salin `.env.example` menjadi `.env.local`, isi URL dan publishable key project Supabase.
3. `npm install` lalu `npm run dev` -> http://localhost:3000
4. Masuk dengan akun Admin Daerah (role `super_admin` di tabel `profiles`).

## Membuat akun
Supabase Dashboard -> Authentication -> Users -> Add user (centang Auto Confirm). Lalu di
`/admin/akun` ubah peran, pilih desa (Admin Desa), dan tugaskan juri ke lomba.
Matikan "Allow new users to sign up" di Authentication -> Sign In / Providers.

## Deploy (Vercel)
Import repo, isi Environment Variables `NEXT_PUBLIC_SUPABASE_URL` dan
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Jangan pernah memasukkan `service_role` / secret key.

## Catatan
- Komposisi tim (mis. "1 imam, 5 putra, 4 putri") hanya dibatasi jumlah anggotanya; komposisi dicek panitia.
- Nilai akhir = rata-rata total nilai semua juri - pengurangan nilai (penalti). Dihitung di view database.
