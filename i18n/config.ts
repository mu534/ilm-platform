export const locales = ['en', 'om', 'ar', 'am'] as const;
export const defaultLocale = 'en' as const;

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  om: 'Afaan Oromo',
  ar: 'العربية',
  am: 'አማርኛ',
};

export const localeFlags: Record<Locale, string> = {
  en: '🇬🇧',
  om: '🇪🇹',
  ar: '🇸🇦',
  am: '🇪🇹',
};

export const localeDirections: Record<Locale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  om: 'ltr',
  ar: 'rtl',
  am: 'ltr',
};

export function isRTL(locale: Locale): boolean {
  return localeDirections[locale] === 'rtl';
}
