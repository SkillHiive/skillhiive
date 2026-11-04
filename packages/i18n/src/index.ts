// i18n package - Internationalization
export const locales = ["en", "es", "fr", "de", "ja", "ko", "zh"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export function getLocale(): Locale {
  if (typeof navigator !== "undefined") {
    const language = navigator.language;
    if (language) {
      const lang = language.split("-")[0] as Locale;
      if (locales.includes(lang)) {
        return lang;
      }
    }
  }
  return defaultLocale;
}

export function formatDate(date: Date, locale: Locale = getLocale()): string {
  return new Intl.DateTimeFormat(locale).format(date);
}

export function formatNumber(num: number, locale: Locale = getLocale()): string {
  return new Intl.NumberFormat(locale).format(num);
}

export function formatCurrency(amount: number, currency = "USD", locale: Locale = getLocale()): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}