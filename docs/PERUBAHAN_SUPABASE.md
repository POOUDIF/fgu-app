# Perubahan Supabase — Juklak/Juknis Revisi (Oktober 2026)

Dokumen ini menjelaskan **apa saja yang harus diubah di Supabase** agar cocok dengan perubahan
aplikasi dan *Revisi Juklak Juknis Lomba FGU 3.0 - 091026.pdf*.

> **Batasan.** `fgu_01_schema.sql` dan `fgu_02_seed.sql` tidak ada di repositori, jadi skema
> asli di Supabase tidak bisa saya baca. SQL di bawah ditulis dari kode aplikasi dan **belum
> dijalankan terhadap database Anda**. Bagian [4](#4-yang-perlu-dicek-karena-skema-asli-tidak-terlihat)
> berisi query pemeriksaan. Bila Anda mengirim kedua file itu, saya bisa memastikan SQL-nya cocok.

---

## 1. Urutan pengerjaan

1. **Backup dulu.** Supabase → *Database → Backups* (atau ekspor tabel `competitions`, `entries`, `participants`).
2. Jalankan **`fgu_05_juklak_revisi.sql`** di *SQL Editor* (perubahan skema + fungsi pendaftaran).
3. Jalankan **LANGKAH 0** dari **`fgu_06_juklak_konten.sql`** *sendiri* (query `select` paling atas).
   Kolom `cocok` harus **1** di semua 16 baris. Bila bukan, sesuaikan pola nama di file itu.
4. Jalankan sisa **`fgu_06_juklak_konten.sql`** (kategori, tempat, juara, ketentuan, kriteria).
5. Cek struktur lomba ([bagian 3](#3-cek-manual-struktur-lomba-kuota--regu--slot)).
6. **Deploy aplikasi** *setelah* langkah 2. Kode baru membaca kolom baru; bila kode ter-deploy lebih
   dulu, halaman admin/juri yang memilih kolom itu akan gagal memuat data.
7. Di aplikasi: *Admin → Pengaturan* — isi jadwal pendaftaran (`registration_opens_at` /
   `registration_closes_at`). Fungsi pendaftaran menolak kiriman bila jadwal belum diatur.

---

## 2. Apa yang diubah (`fgu_05_juklak_revisi.sql`)

### Tabel `competitions` — kolom baru

| Kolom | Tipe | Fungsi |
|---|---|---|
| `registration_mode` | `text`, default `'participant'`, cek `participant`/`open` | `open` = didaftarkan lewat nama (tanpa data peserta desa) |
| `form_fields` | `text[]`, default `{}` | Isian tambahan form `open`: `parent_name`, `ig_username`, `submission_url` (nama selalu ada) |
| `allow_team` | `boolean`, default `false` | Boleh memilih **Individu / Tim** (Video Campaign) |

Lomba yang ditandai `open` oleh migrasi (dicocokkan dari nama):

| Lomba | `form_fields` | Catatan |
|---|---|---|
| Dakwah Online | `{ig_username,submission_url}` | pre-event, online, tanpa batas per desa |
| Karya Tulis | `{ig_username,submission_url}` | pre-event, online |
| Video Campaign | `{ig_username,submission_url}` + `allow_team = true` | Individu/Tim; bisa oleh Admin Desa **dan** umum |
| Mewarnai & Menceritakan | `{parent_name}` | hari H, tanpa link karya |

Untuk keempatnya migrasi juga: `participation_type='individual'`, `team_size=null`,
`max_entries_per_village=null`, dan menghapus slot per desa yang belum dipakai pendaftaran.

### Tabel `entries` — kolom baru

| Kolom | Isi |
|---|---|
| `parent_name` | Nama orang tua (Mewarnai) |
| `ig_username` | Username Instagram tanpa `@` |
| `entry_type` | `individual` / `team` |
| `members_note` | Daftar anggota tim (teks bebas, opsional) |
| `source` | `village` (Admin Desa) atau `public` (umum, tanpa login) |

Nama peserta/tim disimpan di **`team_name`** yang sudah ada, jadi `live_submissions`, `entry_results`,
`public_winners`, halaman juri, dan ekspor Excel langsung menampilkannya **tanpa mengubah view**.
Pendaftaran `open` tidak punya baris `entry_members` (sama seperti pendaftaran tim yang anggotanya kosong).

### Usia fleksibel

- `participants.age` → **boleh kosong** (`drop not null`). Di form usia menjadi opsional.
- `competitions.max_age` → di-`null`-kan di semua lomba. Syarat lomba kini hanya **kelas/jenjang**
  (`levels`, `grade_min`, `grade_max`) dan jenis kelamin (`allowed_genders`).

### Pendaftaran berdasarkan kelas — tanpa kolom baru

Pilihan **Kelas** di form dipetakan ke kolom yang sudah ada:

| Pilihan di form | `education_level` | `grade` |
|---|---|---|
| PAUD / TK | `PAUD` / `TK` | kosong |
| SD kelas 1–6 | `SD` | 1–6 |
| SMP kelas 1–3 | `SMP` | 1–3 |
| SMA/K kelas 1–3 | `SMA` | 1–3 |
| Remaja PGM | `PGM` | kosong |

Peserta lama dengan `SMP` kelas 7–9 atau `SMA` kelas 10–12 tetap tampil benar (dinormalkan di UI).
Opsional, agar data seragam (jalankan hanya bila peserta itu belum terdaftar di lomba, karena
trigger bisa menolak perubahan data peserta yang sudah terdaftar):

```sql
update public.participants set grade = grade - 6 where education_level = 'SMP' and grade >= 7;
update public.participants set grade = grade - 9 where education_level = 'SMA' and grade >= 10;
```

### Fungsi baru `public.submit_open_entries(p_competition_id, p_village_id, p_rows jsonb)`

`security definer`, boleh dipanggil `anon` dan `authenticated`. Satu-satunya jalan pendaftaran lomba `open`:

- **Admin Desa (login):** desa dipaksa sama dengan desa di `profiles` (parameter `p_village_id` diabaikan), `source='village'`.
- **Umum (tanpa login):** wajib `p_village_id`, `source='public'`.
- Maksimal 30 baris per kirim; **semua-atau-tidak-sama-sekali** (satu baris salah membatalkan semuanya).
- Memeriksa: lomba aktif & `open`, jadwal pendaftaran di tabel `events`, `submission_deadline` lomba,
  kuota `max_entries_per_village` (bila diisi), format username IG & link `http(s)`, dan **duplikat**
  (nama sama, lomba sama, desa sama).
- Mengembalikan jumlah baris yang tersimpan.

---

## 3. Cek manual struktur lomba (kuota / regu / slot)

`fgu_06` hanya mengubah **konten** (kategori, tempat, juara, ketentuan, kriteria). Bentuk kuota tiap
lomba (regu atau slot, jumlah anggota) saya **tidak ubah otomatis** karena belum melihat data awal Anda.
Jalankan query ini dan cocokkan dengan kolom "Seharusnya" di tabel bawah:

```sql
select c.sort_order, c.name, c.participation_type, c.team_size, c.max_entries_per_village,
       c.allowed_genders, c.scoring_method,
       (select string_agg(coalesce(s.label, '?') || coalesce(' (' || s.gender || ')', ''), ', ' order by s.sort_order)
          from public.competition_slots s where s.competition_id = c.id) as slot
from public.competitions c
order by c.sort_order;
```

| # | Lomba | Juklak | Seharusnya di database |
|--:|---|---|---|
| 1 | Mewarnai & Menceritakan | Individu, siapa pun boleh; 5 terbaik | `open`, tanpa kuota *(diatur migrasi 05)* |
| 2 | Dakwah Online | Individu; tanpa batas per desa | `open`, tanpa kuota *(migrasi 05)* |
| 3 | Hafalan Asmaul Husna | 1 regu = 2 orang (putra/putri) | regu `team_size=2`, kuota 1 — atau 2 slot |
| 4 | Hafalan Doa Harian | Lihat catatan ② | regu 2 orang, atau slot Putra + Putri |
| 5 | Praktek Sholat Berjamaah | 1 regu = 10 orang (1 imam, 5 putra, 4 putri) | `team`, `team_size=10`, kuota 1 |
| 6 | Hafalan Surat Pendek | 1 orang/desa | individu, kuota 1 |
| 7 | Da'i Cilik | 1 orang/desa; lihat catatan ③ | individu, kuota 1 |
| 8 | Cerdas Cermat | 1 regu = 3 orang | `team_size=3`, `scoring_method='points'` |
| 9 | Adzan Subuh | 1 putra/desa | individu, `allowed_genders={L}`, kuota 1 |
| 10 | Membaca & Menulis Pegon | 1 orang/desa (1 putra / 1 putri) | individu; 1 kuota atau slot Putra + Putri |
| 11 | Hafalan Dalil | 1 putra & 1 putri/desa | 2 slot (Putra, Putri) |
| 12 | Tafsir Al-Qur'an | 1 orang (putra/putri) | individu, kuota 1 |
| 13 | Lomba Masak | 1 regu = 3 putri | `team_size=3`, `allowed_genders={P}`, kuota 1 |
| 14 | Stand Bazar | Grup | `team`, `team_size` kosong, kuota 1 |
| 15 | Karya Tulis | Individu (1 putra / putri) | `open`; kuota **tidak dibatasi** setelah migrasi 05 — lihat catatan ④ |
| 16 | Video Campaign | Individu atau Tim, bebas | `open`, `allow_team=true`, tanpa kuota |

Contoh memperbaiki satu lomba:

```sql
update public.competitions set team_size = 3, participation_type = 'team', max_entries_per_village = 1
where name ~* 'cerdas cermat';
```

Kalau mau, kirim `fgu_01_schema.sql` + `fgu_02_seed.sql`; saya buatkan SQL struktur yang pasti cocok.

---

## 4. Yang perlu dicek karena skema asli tidak terlihat

Jalankan query berikut dan kirim hasilnya bila ada yang janggal.

**a. Trigger yang memeriksa syarat pendaftaran** (jenjang, kelas, batas usia, gender, slot, kuota, satu peserta satu lomba):

```sql
select c.relname as tabel, t.tgname as trigger, pg_get_functiondef(t.tgfoid) as definisi
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
where not t.tgisinternal
  and c.relnamespace = 'public'::regnamespace
  and c.relname in ('entries', 'entry_members', 'participants');
```

Yang dicari:
- Apakah trigger memakai `participants.age` / `competitions.max_age`. Bila `age` boleh kosong, perbandingan
  `age > max_age` dengan `null` aman (dianggap tidak melanggar). Bila ada yang memakai `coalesce(age, 0)` atau menolak `age is null`, perlu disesuaikan.
- Apakah trigger memaksa `slot_id` terisi / menolak `entries` tanpa anggota. Pendaftaran lomba `open`
  membuat `entries` **tanpa slot dan tanpa anggota**.

**b. Kolom `NOT NULL` di `entries`** — fungsi `submit_open_entries` mengisi `competition_id, village_id,
team_name, parent_name, ig_username, submission_url, entry_type, members_note, source`; kolom lain
mengandalkan default. Bila ada kolom wajib lain tanpa default, `insert` akan gagal:

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'entries'
order by ordinal_position;
```

**c. Tipe kolom `competitions.rules` dan `levels`.** `fgu_06` mengisi `rules` sebagai `text[]` dan `levels`
dengan literal `'{PAUD,TK}'` (otomatis mengikuti tipe kolom). Bila `rules` ternyata `jsonb`, ubah
`array[...]::text[]` menjadi `to_jsonb(array[...])`.

```sql
select column_name, data_type, udt_name
from information_schema.columns
where table_schema = 'public' and table_name = 'competitions' and column_name in ('rules', 'levels', 'schedule_type');
```

**d. RLS.** Tidak ada kebijakan yang diubah. Pendaftaran `open` oleh umum **tidak** menyentuh RLS karena lewat
fungsi `security definer`. Admin Desa tetap hanya melihat `entries` desanya (termasuk kiriman umum dari desanya);
Admin Daerah melihat semuanya.

---

## 5. Keamanan endpoint pendaftaran publik

`submit_open_entries` bisa dipanggil siapa pun (itu syarat "tanpa login"). Perlindungan yang sudah ada:
batas 30 baris/kirim, validasi di aplikasi **dan** database, cek duplikat, jadwal pendaftaran, honeypot,
dan pembatas laju di server aplikasi (8 kiriman / 10 menit / IP; per instance, jadi hanya penahan ringan).
Fungsi bisa dipanggil langsung lewat API Supabase (melewati aplikasi), jadi yang melindunginya hanya
validasi database dan jadwal pendaftaran. Bila nanti ada spam, tambahkan **captcha** (Cloudflare Turnstile /
hCaptcha) di form, dan bila perlu batasi lewat `source = 'public'` (admin bisa mendiskualifikasi baris
spam dari halaman Peserta).

---

## 6. Ketidakkonsistenan di PDF juklak (mohon dikonfirmasi panitia)

| # | Temuan | Yang saya pakai |
|--:|---|---|
| ① | **Dakwah Online:** judul slide "PAUD, TK – **SD kelas 3**", kolom kategori "PAUD, TK – **SD kelas 1**" | label "PAUD, TK – SD kelas 1" (tidak memengaruhi pendaftaran karena lomba ini `open`) |
| ② | **Doa Harian:** petunjuk "beregu 2 orang (bebas putra/putri/keduanya)" vs kotak "1 putra & 1 putri per desa" | konten ditulis sesuai petunjuk; struktur (regu/slot) tidak diubah |
| ③ | **Da'i Cilik:** petunjuk "perwakilan desa (putra)" vs kotak "(Putra/Putri)" | tidak membatasi gender |
| ④ | **Karya Tulis:** "Individu (1 putra / putri)" tidak jelas 1 per desa atau 1 per gender | tanpa kuota; isi `max_entries_per_village` bila ingin dibatasi |
| ⑤ | **Adzan Subuh:** judul "SD & SMP" tetapi kategori "Kelas 1–3 SMP" | hanya SMP |
| ⑥ | **Pegon:** "Kelas 1–3 SMP (13–15 tahun)" menyebut usia | usia tidak dipakai |
| ⑦ | **Video Campaign:** tidak ada kriteria penilaian | kriteria lama dibiarkan; juri perlu bobot sebelum menilai |
| ⑧ | **Cerdas Cermat:** tempat "Komplek Daerah", final di "Panggung Utama"; tanpa bobot kriteria (sistem poin) | kriteria lama dibiarkan |
| ⑨ | Sampul PDF bertuliskan *"Dokumen internal panitia"* | tetap dipublikasikan di beranda atas permintaan Anda |

---

## 7. Perilaku aplikasi setelah perubahan

- **Beranda:** tombol "Klik Pendaftaran" → `/dashboard` (diarahkan ke login bila belum masuk); section
  ketentuan memuat tombol PDF (`public/dokumen/Juklak Juknis Lomba FGU 3.0.pdf`); section **Pengumpulan Karya**
  membuka modal pendaftaran tanpa login untuk semua lomba `open`.
- **Admin Desa → Peserta → Tambah:** pilih **Kelas**, lalu pilih **Lomba** (daftar menyesuaikan kelas &
  jenis kelamin dan sisa kuota desa). Peserta langsung terdaftar; untuk lomba regu, peserta otomatis
  masuk ke regu desa yang belum penuh (atau membuat regu baru). Lomba `open` tidak muncul di sini.
- **Admin Desa → Pendaftaran Lomba → (lomba `open`):** form banyak peserta sekaligus.
- **Admin/Juri/Ekspor:** menampilkan username IG, nama orang tua, jenis (Individu/Tim), anggota tim, dan
  sumber (Admin desa / Umum).

## 8. Rollback

Kolom/fungsi baru tidak mengubah data lama, jadi cukup mengembalikan versi aplikasi sebelumnya.
Untuk membersihkan database:

```sql
drop function if exists public.submit_open_entries(uuid, uuid, jsonb);
alter table public.entries drop column if exists parent_name, drop column if exists ig_username,
  drop column if exists entry_type, drop column if exists members_note, drop column if exists source;
alter table public.competitions drop column if exists registration_mode, drop column if exists form_fields,
  drop column if exists allow_team;
```
(`participants.age` yang sudah kosong dan `max_age` yang sudah di-`null`-kan tidak otomatis kembali.)
