import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import { matchPath } from "react-router-dom";
import { useForm } from "react-hook-form";

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