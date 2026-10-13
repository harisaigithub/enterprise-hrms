/**
 * useDashboardLayout — loads the signed-in user's saved dashboard layout from
 * the backend, exposes the server-approved widget catalog for their role, and
 * provides save/reset actions. Falls back to the server-provided default
 * layout; never trusts locally cached layouts.
 */
import { useState, useEffect, useCallback } from "react";
import {
  getDashboardPreferences,
  saveDashboardPreferences,
  resetDashboardPreferences,
} from "../services/dashboardPreferencesService";

export function useDashboardLayout() {
  const [state, setState] = useState({
    loading: true,
    error: false,
    customized: false,
    layout: [],
    catalog: [],
    defaultLayout: [],
    droppedWidgets: [],
    updatedAt: null,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const load = useCallback(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: false }));
    getDashboardPreferences()
      .then((data) => {
        if (cancelled) return;
        setState({
          loading: false,
          error: false,
          customized: Boolean(data?.customized),
          layout: Array.isArray(data?.layout) ? data.layout : [],
          catalog: Array.isArray(data?.catalog) ? data.catalog : [],
          defaultLayout: Array.isArray(data?.defaultLayout) ? data.defaultLayout : [],
          droppedWidgets: Array.isArray(data?.droppedWidgets) ? data.droppedWidgets : [],
          updatedAt: data?.updatedAt ?? null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState((prev) => ({ ...prev, loading: false, error: true }));
      });
    return () => { cancelled = true; };
  }, []);

  // Intentionally synchronizes the layout with the backend on mount/retry.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => load(), [load]);

  const save = useCallback(async (widgets) => {
    setSaving(true);
    setSaveError(null);
    try {
      const data = await saveDashboardPreferences(widgets);
      setState((prev) => ({
        ...prev,
        customized: true,
        layout: Array.isArray(data?.layout) ? data.layout : prev.layout,
        defaultLayout: Array.isArray(data?.defaultLayout) ? data.defaultLayout : prev.defaultLayout,
        catalog: Array.isArray(data?.catalog) ? data.catalog : prev.catalog,
        droppedWidgets: Array.isArray(data?.droppedWidgets) ? data.droppedWidgets : [],
        updatedAt: data?.updatedAt ?? prev.updatedAt,
      }));
      return { ok: true, droppedWidgets: data?.droppedWidgets ?? [] };
    } catch (error) {
      setSaveError(error?.message || "Could not save your dashboard layout. Please try again.");
      return { ok: false, error };
    } finally {
      setSaving(false);
    }
  }, []);

  const reset = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const data = await resetDashboardPreferences();
      setState((prev) => ({
        ...prev,
        customized: false,
        layout: Array.isArray(data?.layout) ? data.layout : prev.defaultLayout,
        defaultLayout: Array.isArray(data?.defaultLayout) ? data.defaultLayout : prev.defaultLayout,
        catalog: Array.isArray(data?.catalog) ? data.catalog : prev.catalog,
        droppedWidgets: [],
        updatedAt: null,
      }));
      return { ok: true };
    } catch (error) {
      setSaveError(error?.message || "Could not reset your dashboard layout. Please try again.");
      return { ok: false, error };
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    loading: state.loading,
    error: state.error,
    customized: state.customized,
    layout: state.layout,
    catalog: state.catalog,
    defaultLayout: state.defaultLayout,
    droppedWidgets: state.droppedWidgets,
    updatedAt: state.updatedAt,
    saving,
    saveError,
    retry: load,
    save,
    reset,
  };
}
