import { getRequestConfig } from 'next-intl/server';
import { locales } from './config';

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locale || !locales.includes(locale as any)) {
    throw new Error(`Invalid locale: ${locale}`);
  }

  return {
    locale: locale as string,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
