import { Cormorant_Garamond, DM_Sans, Amiri } from "next/font/google";
import "./globals.css";
import { Providers } from "./components/Providers";

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable} ${amiri.variable}`}>
      <body className="w-full bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
      <Providers>{children}</Providers>  
      </body>
    </html>
  );
}
