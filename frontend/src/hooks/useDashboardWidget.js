/**
 * useDashboardWidget — per-widget timeout + partial-failure tolerance :
 * "Each query has a timeout. If a service times out, that specific widget shows
 * 'Unable to load — tap to retry' while the rest of the dashboard renders normally."
 *
 * `fetcher` should be a stable function reference (e.g. imported directly from a
 * service module) so this hook doesn't need to guard against re-creation on every render.
 */
import { useState, useEffect, useCallback } from "react";

const DEFAULT_TIMEOUT_MS = 2000;

export function useDashboardWidget(fetcher, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const [state, setState] = useState({ data: null, loading: true, error: false });

  const load = useCallback(() => {
    let cancelled = false;
    setState({ data: null, loading: true, error: false });

    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), timeoutMs);
    });

    Promise.race([fetcher(), timeout])
      .then((res) => { if (!cancelled) setState({ data: res.data, loading: false, error: false }); })
      .catch(() => { if (!cancelled) setState({ data: null, loading: false, error: true }); });

    return () => { cancelled = true; };
  }, [fetcher, timeoutMs]);

  // This effect intentionally synchronizes the widget with its remote API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => load(), [load]);

  return { ...state, retry: load };
}
