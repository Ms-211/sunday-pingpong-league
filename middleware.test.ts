import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.hoisted(() => ({ user: null as { id: string } | null, isAdmin: false, error: null as object | null }));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({
  auth: { getUser: async () => ({ data: { user: auth.user } }) },
  rpc: async () => ({ data: auth.isAdmin, error: auth.error }),
}) }));
import { middleware } from "./middleware";

afterEach(() => vi.unstubAllEnvs());
it("fails closed for anonymous users, ordinary users, permission errors and missing config", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-public-key");
  for (const path of ["/admin", "/ops/league"]) {
    for (const state of [
      { user: null, isAdmin: false, error: null },
      { user: { id: "ordinary" }, isAdmin: false, error: null },
      { user: { id: "admin" }, isAdmin: true, error: {} },
    ]) {
      Object.assign(auth, state);
      const result = await middleware(new NextRequest(`https://example.com${path}`));
      expect(result.status).toBe(307);
      expect(new URL(result.headers.get("location")!).pathname).toBe("/admin/login");
    }
  }
  Object.assign(auth, { user: { id: "operator" }, isAdmin: true, error: null });
  expect((await middleware(new NextRequest("https://example.com/ops/league"))).status).toBe(200);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  expect((await middleware(new NextRequest("https://example.com/admin"))).status).toBe(307);
  expect((await middleware(new NextRequest("https://example.com/admin/login"))).status).toBe(200);
});
