export type Theme = "light" | "dark";

export const THEME_COOKIE_KEY = "pm_theme";
export const DEFAULT_THEME: Theme = "light";

export function normalizeTheme(theme?: string | null): Theme {
  // Keep the product light-first for now, even when an older dark cookie exists.
  if (theme === "light") {
    return "light";
  }
  return DEFAULT_THEME;
}

export async function getCurrentTheme(): Promise<Theme> {
  "use server";

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE_KEY)?.value;

  return normalizeTheme(themeCookie);
}
