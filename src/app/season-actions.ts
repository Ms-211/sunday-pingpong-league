"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

async function adminDb() {
  const db = await createClient();
  if (!db) throw new Error("Supabase 설정이 필요합니다.");
  const { data, error } = await db.rpc("is_admin");
  if (error || !data) throw new Error("관리자 권한이 필요합니다.");
  return db;
}
export async function finalizeSeason(form: FormData) {
  const db = await adminDb();
  const value = z.object({ id: z.string().uuid(), revision: z.coerce.number().int().nonnegative(), confirmed: z.literal("on") }).parse(Object.fromEntries(form));
  const { error } = await db.rpc("finalize_season", { p_season_id: value.id, p_revision: value.revision });
  if (error) redirect(`/admin/seasons?season=${value.id}&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/", "layout");
  redirect(`/admin/seasons?season=${value.id}&saved=1`);
}
