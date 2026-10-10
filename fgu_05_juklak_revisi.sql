-- =====================================================================
-- FGU 3.0 — Migrasi 05: Juklak/Juknis revisi (Oktober 2026)
--   1. Usia fleksibel: participants.age boleh kosong, batas usia lomba dinonaktifkan.
--   2. Pendaftaran berdasarkan kelas: memakai kolom yang sudah ada
--      (participants.education_level + participants.grade) — tidak ada kolom baru.
--   3. Lomba "open" (didaftarkan lewat nama, tanpa data peserta): Dakwah Online,
--      Karya Tulis, Video Campaign, Mewarnai — bisa banyak peserta sekaligus,
--      oleh Admin Desa maupun umum tanpa login.
--   4. Fungsi submit_open_entries(): satu-satunya pintu pendaftaran lomba "open".
--
-- Jalankan di Supabase SQL Editor SETELAH fgu_01 s.d. fgu_04. Aman diulang.
-- Setelah itu jalankan fgu_06_juklak_konten.sql, lalu deploy aplikasi.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. competitions: mode pendaftaran
--    registration_mode : 'participant' (lewat data peserta desa) | 'open' (lewat nama)
--    form_fields       : isian tambahan form 'open' (nama selalu ada):
--                        parent_name | ig_username | submission_url
--    allow_team        : pendaftar boleh memilih Individu / Tim (Video Campaign)
-- ---------------------------------------------------------------------
alter table public.competitions
  add column if not exists registration_mode text not null default 'participant',
  add column if not exists form_fields text[] not null default '{}',
  add column if not exists allow_team boolean not null default false;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'competitions_registration_mode_chk') then
    alter table public.competitions
      add constraint competitions_registration_mode_chk check (registration_mode in ('participant', 'open'));
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. entries: data pendaftaran lomba "open"
--    Nama peserta/tim disimpan di kolom team_name yang sudah ada, sehingga semua view
--    (live_submissions, entry_results, public_winners), halaman juri, dan ekspor
--    otomatis menampilkannya tanpa perubahan.
-- ---------------------------------------------------------------------
alter table public.entries
  add column if not exists parent_name text,
  add column if not exists ig_username text,
  add column if not exists entry_type text,
  add column if not exists members_note text,
  add column if not exists source text not null default 'village';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'entries_entry_type_chk') then
    alter table public.entries
      add constraint entries_entry_type_chk check (entry_type is null or entry_type in ('individual', 'team'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'entries_source_chk') then
    alter table public.entries
      add constraint entries_source_chk check (source in ('village', 'public'));
  end if;
end $$;

create index if not exists entries_competition_village_idx on public.entries (competition_id, village_id);

-- ---------------------------------------------------------------------
-- 3. Usia fleksibel
-- ---------------------------------------------------------------------
alter table public.participants alter column age drop not null;

-- Batas usia lomba tidak dipakai lagi (syarat peserta = kelas/jenjang + jenis kelamin).
update public.competitions set max_age = null where max_age is not null;

-- ---------------------------------------------------------------------
-- 4. Tandai lomba yang berjenis "open" (dicocokkan lewat nama)
-- ---------------------------------------------------------------------
-- Dakwah Online & Karya Tulis & Video Campaign: nama + username IG + link video/karya
update public.competitions
set registration_mode = 'open',
    form_fields = '{ig_username,submission_url}',
    submission_mode = 'online',
    schedule_type = 'pre_event',
    participation_type = 'individual',
    team_size = null,
    max_entries_per_village = null
where name ~* 'dakwah|karya tulis|video campaign';

-- Video Campaign: boleh Individu atau Tim
update public.competitions set allow_team = true where name ~* 'video campaign';
update public.competitions set allow_team = false where name ~* 'dakwah|karya tulis|mewarna';

-- Mewarnai: nama peserta + nama orang tua (tanpa link karya, dinilai langsung di hari H)
update public.competitions
set registration_mode = 'open',
    form_fields = '{parent_name}',
    submission_mode = 'offline',
    schedule_type = 'hari_h',
    participation_type = 'individual',
    team_size = null,
    max_entries_per_village = null
where name ~* 'mewarna';

-- Lomba "open" tidak memakai slot per desa (slot yang sudah dipakai pendaftaran dibiarkan).
delete from public.competition_slots s
using public.competitions c
where s.competition_id = c.id
  and c.registration_mode = 'open'
  and not exists (select 1 from public.entries e where e.slot_id = s.id);

-- ---------------------------------------------------------------------
-- 5. submit_open_entries — pendaftaran lomba "open" (banyak peserta sekaligus)
--
--  * Admin Desa (login) : desa dipaksa = desa pada profilnya, source = 'village'.
--  * Umum (anon / bukan Admin Desa): wajib kirim p_village_id, source = 'public'.
--  * Semua-atau-tidak-sama-sekali: satu baris tidak valid membatalkan seluruh kiriman.
--  * Memeriksa jadwal pendaftaran (events), batas pengiriman lomba, kuota, dan duplikat.
-- ---------------------------------------------------------------------
create or replace function public.submit_open_entries(
  p_competition_id uuid,
  p_village_id uuid,
  p_rows jsonb
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comp     public.competitions%rowtype;
  v_ev       public.events%rowtype;
  v_uid      uuid := auth.uid();
  v_role     text;
  v_myvil    uuid;
  v_village  uuid;
  v_source   text;
  v_row      jsonb;
  v_i        int := 0;
  v_count    int := 0;
  v_name     text;
  v_parent   text;
  v_ig       text;
  v_url      text;
  v_type     text;
  v_note     text;
  v_existing int;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'Isi minimal 1 peserta.';
  end if;
  if jsonb_array_length(p_rows) > 30 then
    raise exception 'Maksimal 30 peserta sekali kirim.';
  end if;

  select * into v_comp from public.competitions where id = p_competition_id;
  if not found or not v_comp.is_active or v_comp.registration_mode <> 'open' then
    raise exception 'Lomba tidak tersedia untuk pendaftaran ini.';
  end if;

  -- Siapa yang mendaftar?
  if v_uid is not null then
    select p.role::text, p.village_id into v_role, v_myvil from public.profiles p where p.id = v_uid;
  end if;
  if v_role = 'village_admin' then
    if v_myvil is null then
      raise exception 'Akun Anda belum dihubungkan ke desa. Hubungi panitia.';
    end if;
    v_village := v_myvil;
    v_source := 'village';
  else
    v_village := p_village_id;
    v_source := 'public';
  end if;
  if v_village is null or not exists (select 1 from public.villages where id = v_village) then
    raise exception 'Pilih desa terlebih dahulu.';
  end if;

  -- Jadwal pendaftaran & batas pengiriman
  select * into v_ev from public.events order by created_at limit 1;
  if not found then
    raise exception 'Jadwal pendaftaran belum diatur panitia.';
  end if;
  if v_ev.registration_opens_at is not null and now() < v_ev.registration_opens_at then
    raise exception 'Pendaftaran belum dibuka.';
  end if;
  if v_ev.registration_closes_at is not null and now() > v_ev.registration_closes_at then
    raise exception 'Pendaftaran sudah ditutup.';
  end if;
  if v_comp.submission_deadline is not null and now() > v_comp.submission_deadline then
    raise exception 'Batas pengiriman karya lomba ini sudah lewat.';
  end if;

  -- Kuota per desa (bila diatur)
  if v_comp.max_entries_per_village is not null then
    select count(*) into v_existing from public.entries e
     where e.competition_id = v_comp.id and e.village_id = v_village and e.status = 'registered';
    if v_existing + jsonb_array_length(p_rows) > v_comp.max_entries_per_village then
      raise exception 'Kuota % untuk desa ini maksimal % pendaftaran (sudah % terdaftar).',
        v_comp.name, v_comp.max_entries_per_village, v_existing;
    end if;
  end if;

  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_i := v_i + 1;
    v_name   := btrim(coalesce(v_row ->> 'name', ''));
    v_type   := coalesce(nullif(v_row ->> 'entry_type', ''), 'individual');
    v_parent := null; v_ig := null; v_url := null; v_note := null;

    if v_type not in ('individual', 'team') or (v_type = 'team' and not v_comp.allow_team) then
      raise exception 'Peserta ke-%: jenis pendaftaran tidak valid untuk lomba ini.', v_i;
    end if;
    if v_name = '' or char_length(v_name) > 100 then
      raise exception 'Peserta ke-%: nama wajib diisi (maksimal 100 karakter).', v_i;
    end if;

    if 'parent_name' = any (v_comp.form_fields) then
      v_parent := btrim(coalesce(v_row ->> 'parent_name', ''));
      if char_length(v_parent) < 2 or char_length(v_parent) > 100 then
        raise exception 'Peserta ke-%: nama orang tua wajib diisi (2-100 karakter).', v_i;
      end if;
    end if;

    if 'ig_username' = any (v_comp.form_fields) then
      v_ig := ltrim(btrim(coalesce(v_row ->> 'ig_username', '')), '@');
      if v_ig !~ '^[A-Za-z0-9._]{1,30}$' then
        raise exception 'Peserta ke-%: username Instagram tidak valid.', v_i;
      end if;
    end if;

    if 'submission_url' = any (v_comp.form_fields) then
      v_url := btrim(coalesce(v_row ->> 'submission_url', ''));
      if v_url !~* '^https?://[^[:space:]]+$' or char_length(v_url) > 500 then
        raise exception 'Peserta ke-%: link harus diawali http:// atau https://.', v_i;
      end if;
    end if;

    if v_type = 'team' then
      v_note := nullif(left(btrim(coalesce(v_row ->> 'members_note', '')), 500), '');
    end if;

    if exists (
      select 1 from public.entries e
       where e.competition_id = v_comp.id
         and e.village_id = v_village
         and e.status = 'registered'
         and lower(btrim(coalesce(e.team_name, ''))) = lower(v_name)
    ) then
      raise exception 'Peserta ke-%: "%" sudah terdaftar di lomba ini untuk desa tersebut.', v_i, v_name;
    end if;

    insert into public.entries
      (competition_id, village_id, team_name, parent_name, ig_username, submission_url, entry_type, members_note, source)
    values
      (v_comp.id, v_village, v_name, v_parent, v_ig, v_url, v_type, v_note, v_source);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.submit_open_entries(uuid, uuid, jsonb) from public;
grant execute on function public.submit_open_entries(uuid, uuid, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. Verifikasi (hanya membaca)
-- ---------------------------------------------------------------------
select sort_order, name, registration_mode, form_fields, allow_team, submission_mode, schedule_type,
       max_entries_per_village, max_age
from public.competitions
order by sort_order;
