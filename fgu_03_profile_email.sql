-- =====================================================================
-- FGU 3.0 — Migrasi 03: simpan email di profiles
-- Dibutuhkan halaman "Akun & Juri" di dasbor Admin Daerah (email di
-- auth.users tidak bisa dibaca langsung dari aplikasi).
-- Jalankan SETELAH fgu_01_schema.sql dan fgu_02_seed.sql.
-- =====================================================================

alter table public.profiles add column if not exists email text;

-- Isi untuk akun yang sudah ada
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is distinct from u.email;

-- Akun baru otomatis menyimpan email
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end; $$;

-- ---------------------------------------------------------------------
-- View untuk dashboard live Admin Daerah: 1 baris = 1 juri menilai 1 pendaftaran
-- (total sudah dihitung: berbobot 0-100, atau poin mentah untuk Cerdas Cermat)
-- ---------------------------------------------------------------------
create or replace view public.live_submissions with (security_invoker = true) as
select
  s.entry_id,
  s.judge_id,
  max(s.updated_at)  as submitted_at,
  count(*)           as criteria_count,
  case c.scoring_method
    when 'points' then sum(s.score)
    else round(100 * sum(s.score / cr.max_score * cr.weight) / nullif(sum(cr.weight), 0), 2)
  end                as total,
  c.name             as competition_name,
  v.name             as village_name,
  coalesce(pr.full_name, '') as judge_name,
  coalesce(e.team_name,
    (select string_agg(p.full_name, ', ' order by p.full_name)
       from public.entry_members m join public.participants p on p.id = m.participant_id
      where m.entry_id = e.id)) as entry_label
from public.scores s
join public.criteria cr    on cr.id = s.criterion_id
join public.entries e      on e.id = s.entry_id
join public.competitions c on c.id = e.competition_id
join public.villages v     on v.id = e.village_id
left join public.profiles pr on pr.id = s.judge_id
group by s.entry_id, s.judge_id, c.scoring_method, c.name, v.name, pr.full_name, e.id, e.team_name;

revoke all on public.live_submissions from anon;
grant select on public.live_submissions to authenticated;
