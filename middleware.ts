import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  if (req.nextUrl.pathname === "/admin/login") return res;
  const login = (reason?: string) => {
    const target = req.nextUrl.clone();
    target.pathname = "/admin/login";
    target.search = reason ? `?error=${reason}` : "";
    return NextResponse.redirect(target);
  };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return login("config");
  const db = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll(items) {
        items.forEach(i => req.cookies.set(i.name, i.value));
        res = NextResponse.next({ request: req });
        items.forEach(i => res.cookies.set(i.name, i.value, i.options));
      },
    },
  });
  const { data: { user } } = await db.auth.getUser();
  if (!user) return login();
  const { data: isAdmin, error } = await db.rpc("is_admin");
  if (error || !isAdmin) return login("forbidden");
  return res;
}
export const config = { matcher: ["/admin/:path*", "/ops/:path*"] };
