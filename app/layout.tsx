import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, Amiri } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/components/Providers";
import { Navbar } from "@/app/components/NavBar";
import { Footer } from "@/app/components/Footer";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const amiri = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Ilm Platform – Islamic Learning",
    template: "%s | Ilm Platform",
  },
  description:
    "A comprehensive Islamic educational platform featuring lectures, scholars, and knowledge.",
  keywords: [
    "Islamic education",
    "lectures",
    "scholars",
    "Quran",
    "Hadith",
    "Islam",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${cormorant.variable} ${dmSans.variable} ${amiri.variable}`}
      >
        <Providers>
          <div className="flex flex-col min-h-screen w-full">
            <Navbar />
            <main className="p-5">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
