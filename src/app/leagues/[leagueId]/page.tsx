import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OpsBoard } from "@/components/OpsBoard";
import { getLeague } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const league = await getLeague(leagueId);

  if (!league || league.status === "DRAFT") notFound();
  const db = await createClient();
  const season = db ? (await db.from("seasons").select("finalized_at").eq("id",league.season_id).single()).data : null;

  return (
    <div className="public-ops-board">
      <Link className="ops-exit-link" href="/">
        <ArrowLeft /> 메인으로
      </Link>
      <OpsBoard league={league} finalizedSeason={!!season?.finalized_at} />
    </div>
  );
}
