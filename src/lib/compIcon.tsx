import Image from "next/image";

// Icon per mata lomba, dicocokkan dari nama lomba. Utamanya memakai gambar di
// public/icons; lomba yang belum punya gambar jatuh ke emoji (lalu 🏆).

interface IconRule {
  match: RegExp;
  file?: string; // nama berkas di public/icons (tanpa .png)
  emoji: string;
}

const RULES: IconRule[] = [
  { match: /mewarna/i, file: "mewarnai", emoji: "🎨" },
  { match: /hafalan surat|juz\s*30/i, file: "hafalan-surat-pendek-juz-30", emoji: "📖" },
  { match: /kaligrafi/i, file: "kaligrafi", emoji: "✍️" },
  { match: /khotbah/i, file: "khotbah-jumat", emoji: "🕌" },
  { match: /business plan/i, file: "business-plan", emoji: "📊" },
  { match: /puzzle/i, file: "puzzle", emoji: "🧩" },
  { match: /nasehat|dai cilik/i, file: "nasehat-dai-cilik", emoji: "📢" },
  { match: /dakwah/i, emoji: "🗣️" },
  { match: /pegon/i, file: "membaca-menulis-pegon", emoji: "✒️" },
  { match: /\bmc\b/i, file: "mc", emoji: "🎤" },
  { match: /video kreatif|29 karakter/i, file: "video-kreatif-29-karakter", emoji: "🎬" },
  { match: /video campaign/i, emoji: "📹" },
  { match: /asmaul husna/i, file: "asmaul-husna", emoji: "📿" },
  { match: /pr\s*13/i, file: "pr-13", emoji: "🎖️" },
  { match: /dalil|quran hadits/i, file: "hafalan-dalil-quran-hadits", emoji: "📘" },
  { match: /tafsir/i, emoji: "📙" },
  { match: /karya tulis/i, emoji: "📝" },
  { match: /masak/i, file: "masak", emoji: "🍳" },
  { match: /bazaar|bazar/i, file: "bazaar", emoji: "🛍️" },
  { match: /doa harian/i, file: "hafalan-doa-harian", emoji: "🤲" },
  { match: /adzan|azan/i, file: "adzan-subuh", emoji: "🔔" },
  { match: /sholat berjamaah|shalat berjamaah/i, file: "sholat-berjamaah", emoji: "🙏" },
  { match: /cerdas cermat/i, file: "cerdas-cermat", emoji: "🧠" },
];

const DEFAULT_EMOJI = "🏆";

function findRule(name: string | null | undefined) {
  return name ? RULES.find((r) => r.match.test(name)) : undefined;
}

export function compIcon(name: string | null | undefined): string {
  return findRule(name)?.emoji ?? DEFAULT_EMOJI;
}

export function CompIcon({
  name,
  size = 48,
}: {
  name: string | null | undefined;
  size?: number;
}) {
  const rule = findRule(name);
  if (rule?.file) {
    return (
      <Image
        className="comp-icon-img"
        src={`/icons/${rule.file}.png`}
        alt=""
        width={size}
        height={size}
      />
    );
  }
  return (
    <span
      className="comp-icon"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
      aria-hidden
    >
      {rule?.emoji ?? DEFAULT_EMOJI}
    </span>
  );
}
