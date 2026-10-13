/**
 * Theme utilities — pure, testable helpers for the Light/Dark/System theme.
 * The stored preference is the *mode* ("light" | "dark" | "system");
 * the *resolved* theme is what actually gets applied to <html data-theme>.
 */

export const THEME_STORAGE_KEY = "hrms_theme";

export const THEME_MODES = ["light", "dark", "system"];

export function normalizeThemeMode(value) {
  return THEME_MODES.includes(value) ? value : "system";
}

export function resolveTheme(mode, prefersDark) {
  if (mode === "light" || mode === "dark") return mode;
  return prefersDark ? "dark" : "light";
}

export function readStoredThemeMode(storage) {
  const store = storage ?? (typeof localStorage !== "undefined" ? localStorage : null);

  try {
    return normalizeThemeMode(store?.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

export function persistThemeMode(mode, storage) {
  const store = storage ?? (typeof localStorage !== "undefined" ? localStorage : null);
  const normalized = normalizeThemeMode(mode);

  try {
    store?.setItem(THEME_STORAGE_KEY, normalized);
  } catch {
    /* storage unavailable (private mode, quota) — theme still applies for this session */
  }

  return normalized;
}
