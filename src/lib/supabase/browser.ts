"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
export function createClient(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;return url&&key?createBrowserClient<Database>(url,key):null}
