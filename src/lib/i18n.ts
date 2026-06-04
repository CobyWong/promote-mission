import { cookies } from "next/headers";

export const localeCookieName = "pm_locale";
export const supportedLocales = ["zh-HK", "en"] as const;

export type Locale = (typeof supportedLocales)[number];

export function isLocale(value: string | null | undefined): value is Locale {
  return supportedLocales.includes((value ?? "") as Locale);
}

export function normalizeLocale(value: string | null | undefined): Locale {
  if (isLocale(value)) {
    return value;
  }

  return "zh-HK";
}

export async function getCurrentLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get(localeCookieName)?.value);
}
