/** Kisi-kisi lomba, disalin dari Revisi Juklak Juknis Lomba FGU 3.0 (091026). */
export interface KisiKisi {
  title: string;
  lomba: string;
  intro: string[];
  sections: { heading: string; items: string[]; numbered?: boolean }[];
}

export const KISI_KISI: KisiKisi[] = [
  {
    title: "Kisi-kisi Hafalan Doa Harian",
    lomba: "SD Kelas 1–3",
    intro: [
      "Doa yang diuji merujuk pada doa-doa di BUKU SAKU DO'A.",
      "Soal diambil lewat undian: 2 soal doa versi pendek dan 1 soal doa versi panjang. Juri membacakan soal dari hasil undian peserta.",
    ],
    sections: [
      {
        heading: "Doa panjang",
        numbered: true,
        items: [
          "Doa Mohon Tetap Dalam Hidayah",
          "Doa Minta Ilmu Yang Bermanfaat 2",
          "Doa Masuk Rumah",
          "Doa Ketika Melihat Orang Mendapat Musibah/Cobaan",
          "Doa Ketika Tertimpa Musibah",
          "Doa Ketika Susah",
          "Doa Ketika Ada Angin Kencang",
          "Doa Ketika Mendengar Petir",
          "Doa Mohon Perlindungan dari Jeleknya Pendengaran, Penglihatan, Lisan dan Hati",
        ],
      },
      {
        heading: "Doa pendek",
        numbered: true,
        items: [
          "Doa Untuk Kedua Orang Tua",
          "Doa Pagi dan Sore",
          "Doa Selesai Minum Susu",
          "Doa Berdiri dari Duduk",
          "Doa Kebaikan Dunia dan Akhirat",
          "Doa Berpakaian",
          "Doa Masuk/Keluar Masjid",
          "Doa Setelah Mendengar Adzan",
          "Doa Minta Ilmu Yang Bermanfaat 1",
          "Doa Mohon Ketetapan Iman",
          "Doa Bangun Dari Tidur",
          "Doa Setelah Makan",
          "Doa Ketika Keluar Rumah",
        ],
      },
    ],
  },
  {
    title: "Kisi-kisi Hafalan Dalil Al-Qur'an & Al-Hadits",
    lomba: "SMP Kelas 1–3",
    intro: [
      "Soal berupa instruksi dalil dari salah satu kategori materi; peserta menyebutkan 1 dalil dari kategori tersebut.",
      "Saat maju, juri memberi 2 soal (peserta menyebutkan dalil atau artinya). Soal ketiga diambil dan diberikan sesuai nomor undian.",
    ],
    sections: [
      {
        heading: "Materi hafalan dalil beserta artinya",
        numbered: true,
        items: ["6 Thobiat Luhur", "4 Maqodirullah", "3 Sukses"],
      },
      {
        heading: "Kriteria penilaian",
        items: ["Kelancaran lafadz 40%", "Arti dalil 25%", "Makhorijul huruf 35%"],
      },
    ],
  },
];
