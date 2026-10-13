/**
 * ThemeContext — application-wide Light / Dark / System theme.
 *
 * - Persists the explicit mode ("light" | "dark" | "system") in localStorage.
 * - Resolves "system" against the OS prefers-color-scheme signal and keeps
 *   following OS changes while the mode is "system".
 * - Writes the resolved theme to <html data-theme> so the CSS variable
 *   overrides in styles/variables.css apply everywhere.
 * - index.html runs a tiny inline script before paint, so there is no flash
 *   of the wrong theme on load; this provider keeps it in sync afterwards.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  persistThemeMode,
  readStoredThemeMode,
  resolveTheme,
} from "../utils/theme";

const ThemeContext = createContext(null);

function systemPrefersDark() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(() => readStoredThemeMode());
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark);

  const resolvedTheme = resolveTheme(mode, prefersDark);

  // Follow OS theme changes (only meaningful while mode === "system",
  // but harmless — resolveTheme ignores prefersDark for explicit modes).
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (event) => setPrefersDark(event.matches);

    query.addEventListener?.("change", handler);
    return () => query.removeEventListener?.("change", handler);
  }, []);

  // Keep <html data-theme> and native control colors in sync.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", resolvedTheme);
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setMode = useCallback((next) => {
    const normalized = persistThemeMode(next);
    setModeState(normalized);
  }, []);

  const value = useMemo(
    () => ({ mode, resolvedTheme, setMode, prefersDark }),
    [mode, resolvedTheme, setMode, prefersDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
