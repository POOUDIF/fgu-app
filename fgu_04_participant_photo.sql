-- =====================================================================
-- FGU 3.0 — Migrasi 04: foto peserta
-- Path berkas di bucket `participant-photos`: {village_id}/{participant_id}.{jpg|png|webp}
-- Bucket (private, maks 5 MB, image/jpeg|png|webp) dan kebijakan storage.objects
-- harus mengizinkan Admin Desa insert/update/delete pada folder desanya sendiri.
-- =====================================================================

alter table public.participants add column if not exists photo_path text;
