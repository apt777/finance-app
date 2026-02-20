import {getRequestConfig} from 'next-intl/server';
 
// Can be imported from a shared config
export const locales = ['ko', 'en', 'ja', 'zh'];
export const defaultLocale = 'ko';
 
export default getRequestConfig(async ({requestLocale}) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;
 
  // Ensure that a valid locale is used
  if (!locale || !locales.includes(locale)) {
    locale = defaultLocale;
  }
 
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});