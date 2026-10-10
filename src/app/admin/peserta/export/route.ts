import { addSheet, createWorkbook, type ExcelRow } from "@/lib/excel";
import { authorizeExport, fetchAll, jsonError, UUID_RE, xlsxResponse } from "@/lib/exportGuard";
import { displayName, kelasLabel } from "@/lib/participant";
import { teamBounds } from "@/lib/lomba";
import { GENDER_LABEL } from "@/lib/utils";
import type { Gender } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface EntryRow {
  id: string;
  status: "registered" | "disqualified";
  team_name: string | null;
  submission_url: string | null;
  ig_username: string | null;
  parent_name: string | null;
  entry_type: "individual" | "team" | null;
  members_note: string | null;
  source: "village" | "public" | null;
  village_id: string;
  competition: { name: string; team_size: number | null; team_min_size: number | null; registration_mode: string | null } | null;
  village: { name: string } | null;
  slot: { label: string } | null;
  members: {
    participant: {
      id: string;
      full_name: string;
      display_name: string | null;
      gender: Gender;
      education_level: string;
      grade: number | null;
      age: number | null;
    } | null;
  }[];
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lomba = params.get("lomba");
  const desa = params.get("desa");
  if ((lomba && !UUID_RE.test(lomba)) || (desa && !UUID_RE.test(desa))) {
    return jsonError("Filter tidak valid.", 400);
  }

  const auth = await authorizeExport();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  try {
    const [entries, villagesRes, compsRes] = await Promise.all([
      fetchAll<EntryRow>((from, to) => {
        let q = supabase
          .from("entries")
          .select(
            "id,status,team_name,submission_url,ig_username,parent_name,entry_type,members_note,source,village_id,competition:competitions(name,team_size,team_min_size,registration_mode),village:villages(name),slot:competition_slots(label),members:entry_members(participant:participants(id,full_name,display_name,gender,education_level,grade,age))",
          );
        if (lomba) q = q.eq("competition_id", lomba);
        if (desa) q = q.eq("village_id", desa);
        return q.order("id").range(from, to);
      }),
      supabase.from("villages").select("id,name").order("sort_order"),
      supabase.from("competitions").select("id", { count: "exact", head: true }),
    ]);
    if (villagesRes.error) throw new Error(villagesRes.error.message);
    if (compsRes.error) throw new Error(compsRes.error.message);

    entries.sort(
      (a, b) =>
        (a.competition?.name ?? "").localeCompare(b.competition?.name ?? "") ||
        (a.village?.name ?? "").localeCompare(b.village?.name ?? "") ||
        (a.slot?.label ?? "").localeCompare(b.slot?.label ?? ""),
    );

    const rows: ExcelRow[] = [];
    // Ringkasan per desa dari data yang sama.
    const regCount = new Map<string, number>();
    const people = new Map<string, Set<string>>();
    const compSet = new Map<string, Set<string>>();

    for (const e of entries) {
      const need = e.competition?.registration_mode === "open" ? 0 : (teamBounds(e.competition ?? { team_size: null }).min ?? 1);
      const members = e.members.map((m) => m.participant).filter((p) => p !== null);
      const base = {
        lomba: e.competition?.name,
        desa: e.village?.name,
        slot: e.slot?.label,
        tim: e.team_name,
        status: e.status === "disqualified" ? "Didiskualifikasi" : "Terdaftar",
        lengkap: members.length >= need ? "Lengkap" : "Belum lengkap",
        tautan: e.submission_url,
        jenis: e.entry_type === "team" ? "Tim" : e.entry_type === "individual" ? "Individu" : null,
        ortu: e.parent_name,
        ig: e.ig_username ? `@${e.ig_username}` : null,
        anggota: e.members_note,
        sumber: e.source === "public" ? "Umum (tanpa login)" : "Admin desa",
      };
      if (members.length === 0) rows.push(base);
      for (const p of members) {
        rows.push({
          ...base,
          nama: displayName(p),
          gender: GENDER_LABEL[p.gender],
          jenjang: p.education_level,
          kelas: kelasLabel(p.education_level, p.grade),
          umur: p.age,
        });
      }

      if (e.status === "registered") {
        regCount.set(e.village_id, (regCount.get(e.village_id) ?? 0) + 1);
        const set = people.get(e.village_id) ?? new Set<string>();
        for (const p of members) set.add(p.id);
        people.set(e.village_id, set);
        const cs = compSet.get(e.village_id) ?? new Set<string>();
        if (e.competition?.name) cs.add(e.competition.name);
        compSet.set(e.village_id, cs);
      }
    }

    const wb = createWorkbook();
    addSheet(
      wb,
      "Pendaftaran",
      [
        { header: "Lomba", key: "lomba" },
        { header: "Desa", key: "desa" },
        { header: "Slot/Kategori", key: "slot" },
        { header: "Nama Tim", key: "tim" },
        { header: "Nama Peserta", key: "nama" },
        { header: "Gender", key: "gender" },
        { header: "Jenjang", key: "jenjang" },
        { header: "Kelas", key: "kelas" },
        { header: "Umur", key: "umur" },
        { header: "Jenis", key: "jenis" },
        { header: "Nama Orang Tua", key: "ortu" },
        { header: "Username IG", key: "ig" },
        { header: "Anggota Tim", key: "anggota" },
        { header: "Sumber", key: "sumber" },
        { header: "Status", key: "status" },
        { header: "Kelengkapan", key: "lengkap" },
        { header: "Tautan Karya", key: "tautan" },
      ],
      rows,
    );

    const totalComps = compsRes.count ?? 0;
    addSheet(
      wb,
      "Ringkasan Desa",
      [
        { header: "Desa", key: "desa" },
        { header: "Jumlah pendaftaran aktif", key: "reg" },
        { header: "Jumlah peserta", key: "peserta" },
        { header: `Terisi dari ${totalComps} lomba`, key: "lomba" },
      ],
      (villagesRes.data ?? [])
        .filter((v) => !desa || v.id === desa)
        .map((v) => ({
          desa: v.name,
          reg: regCount.get(v.id) ?? 0,
          peserta: people.get(v.id)?.size ?? 0,
          lomba: compSet.get(v.id)?.size ?? 0,
        })),
    );

    return await xlsxResponse(wb, "peserta");
  } catch (err) {
    console.error("export peserta gagal:", err);
    return jsonError("Gagal membuat file Excel. Coba lagi.", 500);
  }
}
