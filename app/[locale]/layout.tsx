import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, Amiri } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, localeDirections, isRTL } from '@/i18n/config';
import "../globals.css";
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
    "Islamic education", "Quran learning", "Hadith studies",
    "Islamic lectures", "scholars", "Islamic knowledge",
    "Fiqh", "Islamic history", "Tawhid", "Islamic ethics",
    "online Islamic courses", "Islamic LMS",
  ],
  authors: [{ name: "Ilm Platform Team" }],
  creator: "Ilm Platform",
  publisher: "Ilm Platform",
  formatDetection: { email: false, address: false, telephone: false },
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "https://ilm-platform.com"),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXTAUTH_URL ?? "https://ilm-platform.com",
    title: "Ilm Platform – Authentic Islamic Learning",
    description: "Discover authentic Islamic knowledge through lectures from qualified scholars.",
    siteName: "Ilm Platform",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Ilm Platform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ilm Platform – Authentic Islamic Learning",
    description: "Discover authentic Islamic knowledge through lectures from qualified scholars.",
    images: ["/og-image.jpg"],
    creator: "@ilmplatform",
  },
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Validate locale
  if (!locales.includes(locale as any)) notFound();

  const messages = await getMessages();
  const direction = localeDirections[locale as keyof typeof localeDirections] || 'ltr';

  return (
    <html
      lang={locale}
      dir={direction}
      className={`${cormorant.variable} ${dmSans.variable} ${amiri.variable}`}
    >
      <body className="w-full bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
        {/* JSON-LD structured data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "EducationalOrganization",
              "name": "Ilm Platform",
              "description": "Authentic Islamic Learning Platform",
              "url": process.env.NEXTAUTH_URL ?? "https://ilm-platform.com",
              "logo": `${process.env.NEXTAUTH_URL ?? "https://ilm-platform.com"}/favicon.ico`,
              "sameAs": ["https://github.com/mu534/ilm-platform"],
              "teaches": ["Islamic Studies", "Quran", "Hadith", "Fiqh", "Arabic"],
            }),
          }}
        />
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <div className="flex flex-col min-h-screen w-full">
              <Navbar />
              <main className="flex-1 w-full min-w-0">{children}</main>
              <Footer />
            </div>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
