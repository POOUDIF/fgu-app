import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Festival Generasi Unggul 3.0",
  description:
    "Festival lomba anak sholeh: pendaftaran peserta, penilaian juri, dan hasil lomba FGU 3.0.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <Nav />
        <main>{children}</main>
        <footer className="footer">
          <div className="container">Festival Generasi Unggul (FGU) 3.0 · Bekasi Barat</div>
        </footer>
      </body>
    </html>
  );
}
