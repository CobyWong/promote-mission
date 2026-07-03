export type Theme = "light" | "dark";

export const THEME_COOKIE_KEY = "pm_theme";
export const DEFAULT_THEME: Theme = "light";

export function normalizeTheme(theme?: string | null): Theme {
  if (theme === "light" || theme === "dark") {
    return theme;
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
