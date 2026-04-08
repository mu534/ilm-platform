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
    default: "Ilm Platform – Authentic Islamic Learning",
    template: "%s | Ilm Platform",
  },
  description:
    "Discover authentic Islamic knowledge through lectures from qualified scholars. Learn Quran, Hadith, Fiqh, and Islamic history with our comprehensive educational platform.",
  keywords: [
    "Islamic education",
    "Quran learning",
    "Hadith studies",
    "Islamic lectures",
    "scholars",
    "Islamic knowledge",
    "Fiqh",
    "Islamic history",
    "Tawhid",
    "Islamic ethics",
  ],
  authors: [{ name: "Ilm Platform Team" }],
  creator: "Ilm Platform",
  publisher: "Ilm Platform",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://ilm-platform.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ilm-platform.com",
    title: "Ilm Platform – Authentic Islamic Learning",
    description: "Discover authentic Islamic knowledge through lectures from qualified scholars.",
    siteName: "Ilm Platform",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Ilm Platform - Islamic Learning Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ilm Platform – Authentic Islamic Learning",
    description: "Discover authentic Islamic knowledge through lectures from qualified scholars.",
    images: ["/og-image.jpg"],
    creator: "@ilmplatform",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${dmSans.variable} ${amiri.variable}`}
    >
      <body className="w-full bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
        <Providers>
          <div className="flex flex-col min-h-screen w-full">
            <Navbar />
            <main className="flex-1 w-full min-w-0">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
