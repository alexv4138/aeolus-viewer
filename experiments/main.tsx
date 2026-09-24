import React from "react";
import { createRoot } from "react-dom/client";
import Dashboard from "./app/optimized/page";
import { workbookUsers } from "./app/fleet-data";
import "./globals.css";

// Preserve the copied frontend unchanged while replacing its backend with local-only mocks.
const nativeFetch = window.fetch.bind(window);
const demoUser = { ...workbookUsers[4], master: true };
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
window.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.href);
  if (url.pathname === "/api/auth/session" || url.pathname === "/api/auth/login") return json({ user: demoUser });
  if (url.pathname === "/api/auth/logout") return json({ ok: true });
  if (url.pathname === "/api/notes") {
    const key = `experiment-notes-${url.searchParams.get("locationId") || "all"}`;
    if (init?.method === "POST") {
      const body = JSON.parse(String(init.body || "{}"));
      const note = { id: crypto.randomUUID(), locationId: body.locationId, authorUsername: demoUser.username, authorName: demoUser.name, body: body.body, createdAt: Date.now() };
      const target = `experiment-notes-${body.locationId}`;
      localStorage.setItem(target, JSON.stringify([note, ...JSON.parse(localStorage.getItem(target) || "[]")]));
      return json({ note });
    }
    return json({ notes: JSON.parse(localStorage.getItem(key) || "[]") });
  }
  if (url.pathname === "/api/telemetry") return nativeFetch("/telemetry.json").then(async (response) => json({ rows: await response.json() }));
  return nativeFetch(input, init);
};

createRoot(document.getElementById("root")!).render(<Dashboard />);
