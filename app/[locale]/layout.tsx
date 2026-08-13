import type { Metadata } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, localeDirections } from '@/i18n/config';
import { Providers } from "@/app/components/Providers";
import { Navbar } from "@/app/components/NavBar";
import { Footer } from "@/app/components/Footer";

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
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Validate locale
  if (!locales.includes(locale as any)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();
  const direction = localeDirections[locale as keyof typeof localeDirections] || 'ltr';

  return (
    <div
      lang={locale}
      dir={direction}
    >
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
    </div>
  );
}
