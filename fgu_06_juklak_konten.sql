-- =====================================================================
-- FGU 3.0 — Migrasi 06: sinkronisasi KONTEN lomba dengan Juklak/Juknis revisi
-- (Revisi Juklak Juknis Lomba FGU 3.0 - 091026.pdf)
--
-- Isi: kategori/kelas, tempat, jumlah juara, ketentuan (rules), dan kriteria
-- penilaian untuk 16 cabang lomba. Struktur kuota/regu/slot TIDAK diubah di sini
-- (lihat docs/PERUBAHAN_SUPABASE.md bagian "Cek manual struktur lomba").
--
-- Jalankan SETELAH fgu_05_juklak_revisi.sql. Aman diulang (idempoten).
-- Lomba dicocokkan lewat pola NAMA (regex). LANGKAH 0 memeriksa tiap pola
-- cocok tepat 1 lomba — perbaiki pola di file ini bila hasilnya bukan 1.
-- Supabase SQL Editor hanya menampilkan hasil query TERAKHIR, jadi jalankan
-- LANGKAH 0 SENDIRI dulu (blok select di bawah), baru jalankan sisanya.
-- =====================================================================

-- LANGKAH 0 (hanya membaca): tiap baris harus 'cocok' = 1
select p.no, p.pola, count(c.id) as cocok, string_agg(c.name, ' | ') as nama_di_database
from (values
  (1, 'mewarna'),
  (2, 'dakwah'),
  (3, 'asmaul'),
  (4, 'doa harian'),
  (5, 'sholat|shalat'),
  (6, 'surat pendek|juz\s*30'),
  (7, 'cilik|nasehat'),
  (8, 'cerdas cermat'),
  (9, 'adzan|azan'),
  (10, 'pegon'),
  (11, 'dalil'),
  (12, 'tafsir'),
  (13, 'masak'),
  (14, 'bazaar|bazar'),
  (15, 'karya tulis'),
  (16, 'video campaign')
) as p(no, pola)
left join public.competitions c on c.name ~* p.pola
group by p.no, p.pola
order by p.no;

-- LANGKAH 1: data lomba (kategori, tempat, juara, kelas, ketentuan)
begin;
-- 1. PAUD – TK
update public.competitions set
  sort_order = 1,
  cluster = 'PAUD – TK',
  age_label = 'PAUD & TK',
  venue = 'Komplek Daerah',
  winner_count = 5,
  schedule_type = 'hari_h',
  levels = '{PAUD,TK}',
  grade_min = null,
  grade_max = null,
  rules = array['Pendaftaran peserta mewarnai dilakukan online melalui website resmi FGU 3.0.',
    'Peserta membawa peralatan lomba masing-masing (alat mewarnai & meja mewarnai).',
    'Peserta mengolah warna pada lembar gambar sesuai kreativitas dan kemampuan masing-masing.',
    'Peserta yang terpilih sebagai 5 besar diminta memberikan presentasi lisan/narasi singkat mengenai makna gambar, tema visual, atau pengalaman pribadi yang relevan dengan gambar tersebut.',
    'Tidak diperkenankan meminjam peralatan dari peserta lain.',
    'Tidak diperkenankan mendapat bantuan selama lomba berlangsung.',
    'Pendamping dilarang memasuki area lomba selama lomba berlangsung.',
    'Karya yang sudah selesai segera dikumpulkan ke panitia.',
    'Sketsa gambar ukuran A4 disediakan panitia.',
    'Keputusan penilaian juri mutlak dan tidak dapat diganggu gugat.']::text[]
where name ~* 'mewarna';
-- 2. PAUD – TK
update public.competitions set
  sort_order = 2,
  cluster = 'PAUD – TK',
  age_label = 'PAUD, TK – SD kelas 1',
  venue = 'Pre-event (daring)',
  winner_count = 3,
  schedule_type = 'pre_event',
  levels = '{PAUD,TK,SD}',
  grade_min = null,
  grade_max = null,
  rules = array['Membuat video dakwah/nasehat maksimal 5 menit, format portrait media sosial (Instagram).',
    'Pendaftaran peserta dilakukan online melalui website resmi FGU 3.0.',
    'Peserta memilih salah satu tema yang ditentukan panitia: Berbakti Kepada Orang Tua, Bersyukur, atau Menjaga Lisan dan Ucapan.',
    'Peserta adalah pemeran/pendakwah dalam video tersebut.',
    'Pembuatan video & isi dakwah boleh dibantu orang tua/pembimbing desa masing-masing.',
    'Berdakwah dengan bahasa umum (tidak menyebutkan hal-hal bithonah).',
    'Upload video maksimal H-3 ke akun media sosial (Instagram) pribadi/desa, tag akun @festivalgenerasiunggul & @jamsirat, dan submit melalui website yang sama saat pendaftaran.',
    'Tidak ada batas jumlah peserta per desa.',
    'Penilaian dilakukan sebelum acara; hasil diumumkan bersamaan dengan lomba lainnya.']::text[]
where name ~* 'dakwah';
-- 3. SD Kelas 1–3
update public.competitions set
  sort_order = 3,
  cluster = 'SD Kelas 1–3',
  age_label = 'Kelas 1–3 SD',
  venue = 'Komplek Daerah',
  winner_count = 3,
  schedule_type = 'hari_h',
  levels = '{SD}',
  grade_min = 1,
  grade_max = 3,
  rules = array['Tampil beregu, 2 orang perwakilan per desa (putra/putri).',
    'Pendamping per desa hanya boleh masuk 1 orang.',
    'Pengujian 1: masing-masing peserta membaca Asmaul Husna sampai selesai dengan cara bergantian dan berurutan per 5 nomor / 2 nomor.',
    'Pengujian 2: peserta mengambil undian soal; juri membacakan 3 nomor, peserta meneruskan 5 nomor berikutnya.',
    'Durasi maksimal menjawab pengujian ke-2: 10 detik.',
    'Urutan penampilan sesuai hasil Technical Meeting.']::text[]
where name ~* 'asmaul';
-- 4. SD Kelas 1–3
update public.competitions set
  sort_order = 4,
  cluster = 'SD Kelas 1–3',
  age_label = 'Kelas 1–3 SD',
  venue = 'Komplek Daerah',
  winner_count = 3,
  schedule_type = 'hari_h',
  levels = '{SD}',
  grade_min = 1,
  grade_max = 3,
  rules = array['Tampil beregu, 2 orang perwakilan per desa (bebas putra/putri/keduanya).',
    'Pendamping per desa hanya boleh masuk 1 orang.',
    'Doa yang diuji merujuk pada doa-doa di BUKU SAKU DO''A.',
    'Bacaan doa dipilih melalui undian: undian 1 (versi panjang), undian 2 (versi pendek). Undian berisi 2 soal doa versi pendek dan 1 soal doa versi panjang.',
    'Juri membacakan soal dari hasil undian peserta.',
    'Doa panjang: Doa Mohon Tetap Dalam Hidayah; Doa Minta Ilmu Yang Bermanfaat 2; Doa Masuk Rumah; Doa Ketika Melihat Orang Mendapat Musibah/Cobaan; Doa Ketika Tertimpa Musibah; Doa Ketika Susah; Doa Ketika Ada Angin Kencang; Doa Ketika Mendengar Petir; Doa Mohon Perlindungan dari Jeleknya Pendengaran, Penglihatan, Lisan dan Hati.',
    'Doa pendek: Doa Untuk Kedua Orang Tua; Doa Pagi dan Sore; Doa Selesai Minum Susu; Doa Berdiri dari Duduk; Doa Kebaikan Dunia dan Akhirat; Doa Berpakaian; Doa Masuk/Keluar Masjid; Doa Setelah Mendengar Adzan; Doa Minta Ilmu Yang Bermanfaat 1; Doa Mohon Ketetapan Iman; Doa Bangun Dari Tidur; Doa Setelah Makan; Doa Ketika Keluar Rumah.',
    'Urutan penampilan sesuai hasil Technical Meeting.']::text[]
where name ~* 'doa harian';
-- 5. SD Kelas 1–3
update public.competitions set
  sort_order = 5,
  cluster = 'SD Kelas 1–3',
  age_label = 'Kelas 1–3 SD',
  venue = 'Komplek Daerah',
  winner_count = 3,
  schedule_type = 'hari_h',
  levels = '{SD}',
  grade_min = 1,
  grade_max = 3,
  rules = array['Tampil beregu 10 orang: 1 imam + makmum putra & putri (1 imam, 5 putra, 4 putri).',
    'Pendamping per desa hanya boleh masuk 1 orang.',
    'Peserta yang belum tampil menunggu di tempat yang disediakan.',
    'Sholat yang dipraktikkan: sholat Subuh berjamaah.',
    'Bacaan surat ditentukan masing-masing desa (tidak terlalu panjang).',
    'Semua bacaan sholat dibaca bersama-sama, kecuali Al-Fatihah & surat pilihan (khusus imam).',
    'Urutan penampilan sesuai hasil Technical Meeting.']::text[]
where name ~* 'sholat|shalat';
-- 6. SD Kelas 4–6
update public.competitions set
  sort_order = 6,
  cluster = 'SD Kelas 4–6',
  age_label = 'Kelas 4–6 SD',
  venue = 'Komplek Daerah',
  winner_count = 3,
  schedule_type = 'hari_h',
  levels = '{SD}',
  grade_min = 4,
  grade_max = 6,
  rules = array['Tampil perorangan, maksimal 1 orang perwakilan desa (putra/putri).',
    'Pendamping per desa hanya boleh masuk 1 orang.',
    'Surat yang diuji: Juz 30 (An-Nas – Al-Lail).',
    'Setiap peserta mendapat 2 sesi: Sesi 1 soal dari undian, Sesi 2 soal langsung dari juri.',
    'Sesi 1: peserta memilih 1 soal via undian yang berisi surat yang harus dibacakan.',
    'Sesi 2: juri membacakan potongan surat, peserta melanjutkan hingga diberhentikan juri.',
    'Urutan penampilan sesuai hasil Technical Meeting.']::text[]
where name ~* 'surat pendek|juz\s*30';
-- 7. SD Kelas 4–6
update public.competitions set
  sort_order = 7,
  cluster = 'SD Kelas 4–6',
  age_label = 'Kelas 4–6 SD',
  venue = 'Panggung Utama',
  winner_count = 3,
  schedule_type = 'hari_h',
  levels = '{SD}',
  grade_min = 4,
  grade_max = 6,
  rules = array['Tampil perorangan, maksimal 1 perwakilan desa.',
    'Durasi maksimal 10 menit — pengurangan nilai bila melebihi waktu.',
    'Juri dapat menghentikan penampilan bila diperlukan.',
    'Tema: "Pentingnya Memiliki 29 Karakter Luhur".',
    'Peserta tampil tanpa membawa teks.',
    'Urutan penampilan sesuai hasil Technical Meeting.']::text[]
where name ~* 'cilik|nasehat';
-- 8. SD Kelas 4–6
update public.competitions set
  sort_order = 8,
  cluster = 'SD Kelas 4–6',
  age_label = 'Kelas 4–6 SD',
  venue = 'Komplek Daerah',
  winner_count = 3,
  schedule_type = 'hari_h',
  levels = '{SD}',
  grade_min = 4,
  grade_max = 6,
  rules = array['1 regu terdiri dari 3 orang (putra/putri) per desa.',
    'Babak 1 (Sistem Poin): setiap grup mendapat 1 paket soal bergantian; soal yang tidak terjawab dinyatakan hangus tanpa pengurangan nilai. Tidak ada grup yang terdiskualifikasi.',
    'Babak 2 (Sistem Lempar): setiap desa diberi soal; bila tak terjawab, dilempar ke grup lain (ada pengurangan nilai bila gagal menjawab awal). Diambil 6 grup terbaik.',
    'Babak 3 (Penyisihan – Adu Cepat): 15 soal rebutan, benar +50, salah −20, durasi 15 detik/soal. 3 tim dieliminasi, 3 tim finalis lanjut ke final.',
    'Babak Final (Panggung Utama – Adu Cepat): 15 soal rebutan, benar +100, salah −50, durasi 10 detik/soal.',
    'Paket soal: studi kasus 29 Karakter Luhur; Quran Hadis bab cerita 25 Nabi; organisasi internal (LDII, SENKOM dll.); paket umum (tanggal hari besar, nama kota & provinsi, Bahasa Indonesia, pengetahuan umum).']::text[]
where name ~* 'cerdas cermat';
-- 9. SMP
update public.competitions set
  sort_order = 9,
  cluster = 'SMP',
  age_label = 'Kelas 1–3 SMP',
  venue = 'Panggung Utama',
  winner_count = 3,
  schedule_type = 'hari_h',
  levels = '{SMP}',
  grade_min = null,
  grade_max = null,
  rules = array['Tampil perorangan, 1 perwakilan desa per kategori (1 putra per desa).',
    'Pendamping per desa hanya boleh masuk 1 orang.',
    'Adzan yang digunakan: Adzan Subuh, nada lagu bebas.',
    'Berpakaian sopan dan rapi.',
    'Urutan penampilan sesuai hasil Technical Meeting.']::text[]
where name ~* 'adzan|azan';
-- 10. SMP
update public.competitions set
  sort_order = 10,
  cluster = 'SMP',
  age_label = 'Kelas 1–3 SMP',
  venue = 'Komplek Daerah',
  winner_count = 3,
  schedule_type = 'hari_h',
  levels = '{SMP}',
  grade_min = null,
  grade_max = null,
  rules = array['Perlombaan dibagi 3 sesi, 1 orang/desa (1 putra / 1 putri).',
    'Sesi 1 — Kitabah (Menulis): panitia membagikan 5 soal berisi penggalan kalimat pegon baku, angka, dll.',
    'Sesi 2 — Istima'' (Mendengarkan): panitia mendiktekan sebuah paragraf dari Nasihat PPG; peserta menulis apa yang dibacakan dalam bentuk pegon.',
    'Sesi 3 — Qira''ah (Membaca): peserta membaca soal yang diberikan juri secara bergantian dengan durasi membaca 5 menit; urutan pembacaan ditentukan panitia.',
    'Peserta duduk di tempat yang diatur panitia; membawa alas tulis/meja lipat & alat tulis sendiri.',
    'Pendamping tidak diperkenankan masuk ruang lomba setelah lomba dimulai.']::text[]
where name ~* 'pegon';
-- 11. SMP
update public.competitions set
  sort_order = 11,
  cluster = 'SMP',
  age_label = 'Kelas 1–3 SMP',
  venue = 'Komplek Daerah',
  winner_count = 3,
  schedule_type = 'hari_h',
  levels = '{SMP}',
  grade_min = null,
  grade_max = null,
  rules = array['Tampil perorangan, 2 perwakilan per desa (putra & putri).',
    'Materi: hafalan dalil 6 Thobiat Luhur, 4 Maqodirullah, dan 3 Sukses beserta artinya.',
    'Soal berupa instruksi dalil dari salah satu kategori materi; peserta menyebutkan 1 dalil dari kategori tersebut.',
    'Saat maju, juri memberi 2 soal — peserta menyebutkan dalil atau artinya.',
    'Soal ketiga diambil dan diberikan sesuai nomor undian.',
    'Urutan penampilan sesuai hasil Technical Meeting.']::text[]
where name ~* 'dalil';
-- 12. SMA / K
update public.competitions set
  sort_order = 12,
  cluster = 'SMA / K',
  age_label = 'Kelas 1–3 SMA/K',
  venue = 'Komplek Daerah',
  winner_count = 3,
  schedule_type = 'hari_h',
  levels = '{SMA}',
  grade_min = null,
  grade_max = null,
  rules = array['Perlombaan bersifat individu (1 orang putra/putri per desa).',
    'Materi uji: menyampaikan makna, keterangan, dan penjelasan dari ayat yang disampaikan.',
    'Tema: Bab Hukum dan Cerita dalam Al-Qur''an — peserta memilih salah satu tema.',
    'Ayat yang disampaikan sesuai tema pilihan; durasi maksimal 15 menit.',
    'Berpakaian rapih dan syar''i.',
    'Langsung menyampaikan tanpa muqodimah; wajib menyampaikan ayat yang telah manqul.',
    'Urutan penampilan sesuai hasil Technical Meeting.']::text[]
where name ~* 'tafsir';
-- 13. SMA / K
update public.competitions set
  sort_order = 13,
  cluster = 'SMA / K',
  age_label = 'Kelas 1–3 SMA/K',
  venue = 'Komplek Daerah',
  winner_count = 3,
  schedule_type = 'hari_h',
  levels = '{SMA}',
  grade_min = null,
  grade_max = null,
  rules = array['1 regu / 3 putri per desa.',
    'Bahan utama masakan: "Ikan", bertemakan masakan daerah Nusantara.',
    'Durasi memasak 90 menit (contoh: 09.00–10.30).',
    'Lokasi meja masak ditentukan panitia.',
    'Anggaran bahan Rp 250.000 per peserta, disediakan panitia setelah pendaftaran.',
    'Bahan, alat masak, dan plating disiapkan masing-masing peserta.',
    'Peserta membuat LPJ (Laporan Pertanggungjawaban) anggaran dalam bentuk hardcopy, diserahkan saat registrasi pengambilan nomor meja.',
    'Penjurian dilakukan Dewan Juri sesuai kriteria penilaian.']::text[]
where name ~* 'masak';
-- 14. Remaja PGM
update public.competitions set
  sort_order = 14,
  cluster = 'Remaja PGM',
  age_label = 'Remaja PGM',
  venue = 'Komplek Daerah',
  winner_count = 3,
  schedule_type = 'hari_h',
  levels = '{PGM}',
  grade_min = null,
  grade_max = null,
  rules = array['Peserta berupa grup.',
    'Stand bazar dipersiapkan pada malam hari sebelum hari pelaksanaan.',
    'Tema bazar: Profesi. Kegiatan dimulai pukul 07.00 WIB.',
    'Waktu penilaian bersifat tentatif dalam kurun waktu lomba bazar.',
    'Peserta menjual produk kuliner/fashion sekreatif mungkin; produk kuliner wajib halal & aman.',
    'Stand didekorasi & dress code peserta sesuai tema Profesi, tetap syar''i.',
    'Menjaga kebersihan & kerapihan area; dilarang berjualan di luar lokasi bazar.']::text[]
where name ~* 'bazaar|bazar';
-- 15. Remaja PGM
update public.competitions set
  sort_order = 15,
  cluster = 'Remaja PGM',
  age_label = 'Remaja PGM',
  venue = 'Komplek Daerah',
  winner_count = 3,
  schedule_type = 'pre_event',
  levels = '{PGM}',
  grade_min = null,
  grade_max = null,
  rules = array['Individu (1 putra / putri).',
    'Karya tulis bertemakan 29 Karakter Luhur.',
    'Peserta diharuskan mempresentasikan atau menceritakan karya tulisnya pada hari perlombaan.',
    'Bentuk karya bebas: tulisan, cerita fiktif/asli, berisi gambar atau komik, dll.',
    'Tidak mengandung SARA, pornografi, atau konten yang melanggar aturan.',
    'Karya tulis dikumpulkan maksimal H-3 acara ke panitia melalui website yang sama saat pendaftaran.',
    'File karya yang diunggah bisa berupa foto (PNG/JPG), PDF, atau Docx.']::text[]
where name ~* 'karya tulis';
-- 16. Kategori Umum
update public.competitions set
  sort_order = 16,
  cluster = 'Kategori Umum',
  age_label = 'Umum (terbuka untuk seluruh usia)',
  venue = 'Komplek Daerah',
  winner_count = 3,
  schedule_type = 'pre_event',
  levels = null,
  grade_min = null,
  grade_max = null,
  rules = array['Video campaign wajib mengangkat semangat, nilai, atau keunikan festival dan mengajak audiens untuk hadir/berpartisipasi.',
    'Peserta perorangan atau tim; terbuka untuk umum. Pendaftaran bisa melalui admin desa maupun umum (tanpa login).',
    'Peserta wajib mengisi formulir pendaftaran dan mengumpulkan karyanya melalui website.',
    'Setiap peserta/tim hanya boleh mengirimkan 1 (satu) karya video.',
    'Peserta wajib mem-follow akun media sosial resmi FGU 3.0 sebagai bentuk keikutsertaan.',
    'Durasi video 60–180 detik (1–3 menit), orientasi vertikal (9:16).',
    'Konten wajib memuat nama/logo/identitas Festival Generasi Unggul, informasi dasar kegiatan (waktu dan lokasi), dan ajakan bertindak (call to action) kepada penonton untuk hadir/berpartisipasi.',
    'Karya orisinal, belum pernah dipublikasikan atau diikutsertakan pada lomba lain.',
    'Video tidak mengandung unsur SARA, pornografi, kekerasan, ujaran kebencian, atau muatan yang melanggar hukum dan norma kesusilaan.',
    'Video diunggah ke akun media sosial pribadi (tidak digembok/publik), menandai akun resmi festival, dan mencantumkan hashtag wajib: #festivalgenerasiunggul3 #videocampaignfgu #jamsirat.',
    'Link video dikirim ke panitia melalui formulir pengumpulan karya paling lambat pada batas waktu yang ditentukan.',
    'Panitia berhak memverifikasi keaslian dan kelayakan karya sebelum masuk tahap penjurian.']::text[]
where name ~* 'video campaign';
commit;

-- LANGKAH 2: kriteria penilaian.
-- Hanya diganti untuk lomba yang BELUM punya nilai juri (agar nilai yang sudah masuk aman).
-- Lomba Cerdas Cermat (sistem poin) dan Video Campaign tidak punya bobot di juklak: tidak diubah.
-- max_score lama dipertahankan (default 100 bila belum ada kriteria).
do $$
declare
  c record;
  v_max numeric;
begin
  -- 1. PAUD – TK
  for c in select id, name from public.competitions where name ~* 'mewarna' loop
    if exists (select 1 from public.scores s join public.criteria k on k.id = s.criterion_id where k.competition_id = c.id) then
      raise notice 'DILEWATI kriteria "%": sudah ada nilai juri', c.name;
    else
      select coalesce(max(max_score), 100) into v_max from public.criteria where competition_id = c.id;
      delete from public.criteria where competition_id = c.id;
      insert into public.criteria (competition_id, group_name, name, weight, max_score, sort_order) values
        (c.id, null, 'Komposisi warna', 30, v_max, 1),
        (c.id, null, 'Motorik & ketelitian', 40, v_max, 2),
        (c.id, null, 'Kerapihan & kebersihan', 30, v_max, 3);
    end if;
  end loop;
  -- 2. PAUD – TK
  for c in select id, name from public.competitions where name ~* 'dakwah' loop
    if exists (select 1 from public.scores s join public.criteria k on k.id = s.criterion_id where k.competition_id = c.id) then
      raise notice 'DILEWATI kriteria "%": sudah ada nilai juri', c.name;
    else
      select coalesce(max(max_score), 100) into v_max from public.criteria where competition_id = c.id;
      delete from public.criteria where competition_id = c.id;
      insert into public.criteria (competition_id, group_name, name, weight, max_score, sort_order) values
        (c.id, null, 'Penyampaian (Bahasa, Mimik, Gesture)', 30, v_max, 1),
        (c.id, null, 'Penguasaan Materi (Pesan Yang Disampaikan)', 40, v_max, 2),
        (c.id, null, 'Penampilan', 30, v_max, 3);
    end if;
  end loop;
  -- 3. SD Kelas 1–3
  for c in select id, name from public.competitions where name ~* 'asmaul' loop
    if exists (select 1 from public.scores s join public.criteria k on k.id = s.criterion_id where k.competition_id = c.id) then
      raise notice 'DILEWATI kriteria "%": sudah ada nilai juri', c.name;
    else
      select coalesce(max(max_score), 100) into v_max from public.criteria where competition_id = c.id;
      delete from public.criteria where competition_id = c.id;
      insert into public.criteria (competition_id, group_name, name, weight, max_score, sort_order) values
        (c.id, null, 'Kebenaran bacaan (makhroj & tajwid)', 40, v_max, 1),
        (c.id, null, 'Kelengkapan hafalan (99 asma sesuai urutan)', 30, v_max, 2),
        (c.id, null, 'Keindahan lantunan (lagu/nada)', 20, v_max, 3),
        (c.id, null, 'Kekompakan', 10, v_max, 4);
    end if;
  end loop;
  -- 4. SD Kelas 1–3
  for c in select id, name from public.competitions where name ~* 'doa harian' loop
    if exists (select 1 from public.scores s join public.criteria k on k.id = s.criterion_id where k.competition_id = c.id) then
      raise notice 'DILEWATI kriteria "%": sudah ada nilai juri', c.name;
    else
      select coalesce(max(max_score), 100) into v_max from public.criteria where competition_id = c.id;
      delete from public.criteria where competition_id = c.id;
      insert into public.criteria (competition_id, group_name, name, weight, max_score, sort_order) values
        (c.id, null, 'Kelancaran', 50, v_max, 1),
        (c.id, null, 'Makhorijul huruf dan Tajwid', 30, v_max, 2),
        (c.id, null, 'Kekompakan', 10, v_max, 3),
        (c.id, null, 'Penampilan seragam', 10, v_max, 4);
    end if;
  end loop;
  -- 5. SD Kelas 1–3
  for c in select id, name from public.competitions where name ~* 'sholat|shalat' loop
    if exists (select 1 from public.scores s join public.criteria k on k.id = s.criterion_id where k.competition_id = c.id) then
      raise notice 'DILEWATI kriteria "%": sudah ada nilai juri', c.name;
    else
      select coalesce(max(max_score), 100) into v_max from public.criteria where competition_id = c.id;
      delete from public.criteria where competition_id = c.id;
      insert into public.criteria (competition_id, group_name, name, weight, max_score, sort_order) values
        (c.id, null, 'Sikap & gerakan sholat', 30, v_max, 1),
        (c.id, null, 'Tuma''ninah sholat', 30, v_max, 2),
        (c.id, null, 'Bacaan sholat + lagu', 30, v_max, 3),
        (c.id, null, 'Kekompakan gerakan', 10, v_max, 4);
    end if;
  end loop;
  -- 6. SD Kelas 4–6
  for c in select id, name from public.competitions where name ~* 'surat pendek|juz\s*30' loop
    if exists (select 1 from public.scores s join public.criteria k on k.id = s.criterion_id where k.competition_id = c.id) then
      raise notice 'DILEWATI kriteria "%": sudah ada nilai juri', c.name;
    else
      select coalesce(max(max_score), 100) into v_max from public.criteria where competition_id = c.id;
      delete from public.criteria where competition_id = c.id;
      insert into public.criteria (competition_id, group_name, name, weight, max_score, sort_order) values
        (c.id, null, 'Kelancaran', 40, v_max, 1),
        (c.id, null, 'Tajwid', 30, v_max, 2),
        (c.id, null, 'Makhorijul huruf', 20, v_max, 3),
        (c.id, null, 'Lagu', 5, v_max, 4),
        (c.id, null, 'Kerapian penampilan', 5, v_max, 5);
    end if;
  end loop;
  -- 7. SD Kelas 4–6
  for c in select id, name from public.competitions where name ~* 'cilik|nasehat' loop
    if exists (select 1 from public.scores s join public.criteria k on k.id = s.criterion_id where k.competition_id = c.id) then
      raise notice 'DILEWATI kriteria "%": sudah ada nilai juri', c.name;
    else
      select coalesce(max(max_score), 100) into v_max from public.criteria where competition_id = c.id;
      delete from public.criteria where competition_id = c.id;
      insert into public.criteria (competition_id, group_name, name, weight, max_score, sort_order) values
        (c.id, null, 'Relevansi dengan tema', 20, v_max, 1),
        (c.id, null, 'Penguasaan materi nasehat', 40, v_max, 2),
        (c.id, null, 'Ketepatan waktu', 5, v_max, 3),
        (c.id, null, 'Retorika (intonasi, ekspresi, persuasi)', 30, v_max, 4),
        (c.id, null, 'Kerapian penampilan', 5, v_max, 5);
    end if;
  end loop;
  -- 9. SMP
  for c in select id, name from public.competitions where name ~* 'adzan|azan' loop
    if exists (select 1 from public.scores s join public.criteria k on k.id = s.criterion_id where k.competition_id = c.id) then
      raise notice 'DILEWATI kriteria "%": sudah ada nilai juri', c.name;
    else
      select coalesce(max(max_score), 100) into v_max from public.criteria where competition_id = c.id;
      delete from public.criteria where competition_id = c.id;
      insert into public.criteria (competition_id, group_name, name, weight, max_score, sort_order) values
        (c.id, null, 'Lagu adzan', 40, v_max, 1),
        (c.id, null, 'Makhorijul huruf', 30, v_max, 2),
        (c.id, null, 'Sikap & gerak (sunnah adzan)', 20, v_max, 3),
        (c.id, null, 'Kerapian penampilan', 10, v_max, 4);
    end if;
  end loop;
  -- 10. SMP
  for c in select id, name from public.competitions where name ~* 'pegon' loop
    if exists (select 1 from public.scores s join public.criteria k on k.id = s.criterion_id where k.competition_id = c.id) then
      raise notice 'DILEWATI kriteria "%": sudah ada nilai juri', c.name;
    else
      select coalesce(max(max_score), 100) into v_max from public.criteria where competition_id = c.id;
      delete from public.criteria where competition_id = c.id;
      insert into public.criteria (competition_id, group_name, name, weight, max_score, sort_order) values
        (c.id, 'Sesi Menulis', 'Ketepatan penulisan', 40, v_max, 1),
        (c.id, 'Sesi Menulis', 'Kerapihan penulisan', 30, v_max, 2),
        (c.id, 'Sesi Menulis', 'Keindahan penulisan', 30, v_max, 3),
        (c.id, 'Sesi Mendengarkan', 'Ketepatan & kesesuaian kata', 40, v_max, 4),
        (c.id, 'Sesi Mendengarkan', 'Ketepatan penulisan', 40, v_max, 5),
        (c.id, 'Sesi Mendengarkan', 'Kerapihan tulisan', 20, v_max, 6),
        (c.id, 'Sesi Membaca', 'Kelancaran membaca', 40, v_max, 7),
        (c.id, 'Sesi Membaca', 'Kecepatan membaca', 30, v_max, 8),
        (c.id, 'Sesi Membaca', 'Kerapihan penampilan', 30, v_max, 9);
    end if;
  end loop;
  -- 11. SMP
  for c in select id, name from public.competitions where name ~* 'dalil' loop
    if exists (select 1 from public.scores s join public.criteria k on k.id = s.criterion_id where k.competition_id = c.id) then
      raise notice 'DILEWATI kriteria "%": sudah ada nilai juri', c.name;
    else
      select coalesce(max(max_score), 100) into v_max from public.criteria where competition_id = c.id;
      delete from public.criteria where competition_id = c.id;
      insert into public.criteria (competition_id, group_name, name, weight, max_score, sort_order) values
        (c.id, null, 'Kelancaran lafadz', 40, v_max, 1),
        (c.id, null, 'Arti dalil', 25, v_max, 2),
        (c.id, null, 'Makhorijul huruf', 35, v_max, 3);
    end if;
  end loop;
  -- 12. SMA / K
  for c in select id, name from public.competitions where name ~* 'tafsir' loop
    if exists (select 1 from public.scores s join public.criteria k on k.id = s.criterion_id where k.competition_id = c.id) then
      raise notice 'DILEWATI kriteria "%": sudah ada nilai juri', c.name;
    else
      select coalesce(max(max_score), 100) into v_max from public.criteria where competition_id = c.id;
      delete from public.criteria where competition_id = c.id;
      insert into public.criteria (competition_id, group_name, name, weight, max_score, sort_order) values
        (c.id, null, 'Kejelasan penyampaian', 70, v_max, 1),
        (c.id, null, 'Penampilan (busana)', 15, v_max, 2),
        (c.id, null, 'Relevansi dengan tema', 15, v_max, 3);
    end if;
  end loop;
  -- 13. SMA / K
  for c in select id, name from public.competitions where name ~* 'masak' loop
    if exists (select 1 from public.scores s join public.criteria k on k.id = s.criterion_id where k.competition_id = c.id) then
      raise notice 'DILEWATI kriteria "%": sudah ada nilai juri', c.name;
    else
      select coalesce(max(max_score), 100) into v_max from public.criteria where competition_id = c.id;
      delete from public.criteria where competition_id = c.id;
      insert into public.criteria (competition_id, group_name, name, weight, max_score, sort_order) values
        (c.id, null, 'Cita rasa', 35, v_max, 1),
        (c.id, null, 'Penyajian', 20, v_max, 2),
        (c.id, null, 'Kebersihan', 15, v_max, 3),
        (c.id, null, 'LPJ', 15, v_max, 4),
        (c.id, null, 'Waktu', 15, v_max, 5);
    end if;
  end loop;
  -- 14. Remaja PGM
  for c in select id, name from public.competitions where name ~* 'bazaar|bazar' loop
    if exists (select 1 from public.scores s join public.criteria k on k.id = s.criterion_id where k.competition_id = c.id) then
      raise notice 'DILEWATI kriteria "%": sudah ada nilai juri', c.name;
    else
      select coalesce(max(max_score), 100) into v_max from public.criteria where competition_id = c.id;
      delete from public.criteria where competition_id = c.id;
      insert into public.criteria (competition_id, group_name, name, weight, max_score, sort_order) values
        (c.id, null, 'Dekorasi stand', 40, v_max, 1),
        (c.id, null, 'Dress code peserta', 25, v_max, 2),
        (c.id, null, 'Keunikan produk', 20, v_max, 3),
        (c.id, null, 'Kebersihan & kerapihan', 15, v_max, 4);
    end if;
  end loop;
  -- 15. Remaja PGM
  for c in select id, name from public.competitions where name ~* 'karya tulis' loop
    if exists (select 1 from public.scores s join public.criteria k on k.id = s.criterion_id where k.competition_id = c.id) then
      raise notice 'DILEWATI kriteria "%": sudah ada nilai juri', c.name;
    else
      select coalesce(max(max_score), 100) into v_max from public.criteria where competition_id = c.id;
      delete from public.criteria where competition_id = c.id;
      insert into public.criteria (competition_id, group_name, name, weight, max_score, sort_order) values
        (c.id, null, 'Kesesuaian tema', 40, v_max, 1),
        (c.id, null, 'Orisinalitas & keunikan karya', 30, v_max, 2),
        (c.id, null, 'Kerapihan penulisan', 30, v_max, 3);
    end if;
  end loop;
end $$;

-- LANGKAH 3 (opsional): batas pengumpulan karya "maksimal H-3" (acara 1 November 2026 -> 29 Oktober 2026).
-- Hapus tanda komentar bila ingin diberlakukan; pendaftaran/pengiriman ditolak otomatis setelah batas ini.
-- update public.competitions set submission_deadline = '2026-10-29 23:59:00+07'
--  where name ~* 'dakwah|karya tulis';

-- Verifikasi akhir
select sort_order, name, cluster, age_label, venue, winner_count, levels, grade_min, grade_max,
       array_length(rules, 1) as jumlah_ketentuan,
       (select count(*) from public.criteria k where k.competition_id = c.id) as jumlah_kriteria
from public.competitions c order by sort_order;
