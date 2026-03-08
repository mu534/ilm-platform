// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

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
      <body>
        <Providers>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
