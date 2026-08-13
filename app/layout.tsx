import { redirect } from 'next/navigation';
import { locales, defaultLocale } from '@/i18n/config';

export default function RootLayout() {
  // The i18n middleware will handle root path redirection
  // This is a fallback in case middleware doesn't handle it
  redirect(`/${defaultLocale}`);
}
