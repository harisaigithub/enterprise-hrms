import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import { matchPath } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  THEME_STORAGE_KEY,
  normalizeThemeMode,
  persistThemeMode,
  readStoredThemeMode,
  resolveTheme,
} from "./src/utils/theme.js";

test("React server rendering produces stable markup", () => {
  const markup = renderToStaticMarkup(
    React.createElement("main", { "aria-label": "HRMS" }, "Workforce Hub")
  );

  assert.equal(markup, '<main aria-label="HRMS">Workforce Hub</main>');
});

test("React Router matches the public login route", () => {
  assert.deepEqual(matchPath("/login", "/login"), {
    params: {},
    pathname: "/login",
    pathnameBase: "/login",
    pattern: { caseSensitive: false, end: true, path: "/login" },
  });
});

test("TanStack Query stores and retrieves cached query data", () => {
  const client = new QueryClient();
  client.setQueryData(["employees", 1], [{ id: "EMP001" }]);

  assert.deepEqual(client.getQueryData(["employees", 1]), [{ id: "EMP001" }]);
  client.clear();
});

test("React Hook Form exposes its form hook", () => {
  assert.equal(typeof useForm, "function");
});

test("theme mode normalization accepts only light, dark or system", () => {
  assert.equal(normalizeThemeMode("light"), "light");
  assert.equal(normalizeThemeMode("dark"), "dark");
  assert.equal(normalizeThemeMode("system"), "system");
  assert.equal(normalizeThemeMode("blue"), "system");
  assert.equal(normalizeThemeMode(undefined), "system");
});

test("explicit light and dark modes ignore the OS preference", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("system mode follows the OS prefers-color-scheme signal", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
});

test("theme preference persists independently of dashboard layout keys", () => {
  const store = new Map();

  const fakeStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
  };

  assert.equal(readStoredThemeMode(fakeStorage), "system");
  assert.equal(persistThemeMode("dark", fakeStorage), "dark");
  assert.equal(store.get(THEME_STORAGE_KEY), "dark");
  assert.equal(readStoredThemeMode(fakeStorage), "dark");
  assert.equal(persistThemeMode("not-a-mode", fakeStorage), "system");
});