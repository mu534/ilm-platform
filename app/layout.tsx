import { redirect } from 'next/navigation';
import { locales, defaultLocale } from '@/i18n/config';

export default function RootLayout() {
  // Redirect root to default locale
  redirect(`/${defaultLocale}`);
}
