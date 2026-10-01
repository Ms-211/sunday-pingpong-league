import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ user: null as { id: string } | null }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: auth.user } }) } }),
}));
vi.mock("@/app/service-worker-registration", () => ({ ServiceWorkerRegistration: () => null }));

import Layout from "./layout";

it("links to login when signed out and admin when signed in", async () => {
  auth.user = null;
  const signedOut = renderToStaticMarkup(await Layout({ children: <main /> }));
  expect(signedOut).toContain('href="/admin/login"');
  expect(signedOut).toContain("관리자 로그인");

  auth.user = { id: "admin" };
  const signedIn = renderToStaticMarkup(await Layout({ children: <main /> }));
  expect(signedIn).toContain('href="/admin"');
  expect(signedIn).toContain(">관리자</span>");
  expect(signedIn).not.toContain('href="/admin/login"');
});