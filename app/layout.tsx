import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_KR, Newsreader, Noto_Serif_KR } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

const plex = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-display",
  display: "swap",
});

const serifKr = Noto_Serif_KR({
  weight: ["300", "400"],
  variable: "--font-serif-kr",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: { default: "한자리 — 함께할 시간, 한눈에", template: "%s | 한자리" },
  description: "로그인 없이 모임 일정을 만들고, 모두가 되는 시간을 히트맵으로 찾으세요.",
  applicationName: "한자리",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f1e8",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" data-scroll-behavior="smooth" className={`${plex.variable} ${newsreader.variable} ${serifKr.variable}`}>
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
