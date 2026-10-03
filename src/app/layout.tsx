import Image from "next/image";
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
    <html lang="id" data-scroll-behavior="smooth">
      <body>
        <Nav />
        <main>{children}</main>
        <footer className="footer">
          <div className="container footer-in">
            <div className="footer-brand">
              <Image src="/icons/logo-fgu.png" alt="Logo FGU" width={48} height={48} />
              <div>
                <b>FGU 3.0</b>
                <span>Festival Generasi Unggul • Bekasi Barat 2026</span>
              </div>
            </div>
            <span className="footer-social">@festivalgenerasiunggul • @jamsirat</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
