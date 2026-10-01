import Link from "next/link";
import { ArrowLeft, CheckCircle2, Layers3 } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { completeLeagueFromOps, generateFinalStage } from "@/app/actions";
import { OpsBoard } from "@/components/OpsBoard";
import { canCompleteLeague } from "@/domain/canCompleteLeague";
import { getLeague } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const db = await createClient();
  if (!db) redirect("/admin/login?error=config");
  const { data: isAdmin, error } = await db.rpc("is_admin");
  if (error || !isAdmin) redirect("/admin/login?error=forbidden");
  const league = await getLeague(leagueId);

  if (!league) notFound();
  const season = db ? (await db.from("seasons").select("finalized_at").eq("id",league.season_id).single()).data : null;
  const completedMatches=league.matches.filter(match=>Boolean(match.match_results)).length;
  const preliminaryMatches=league.matches.filter((match:{stage?:string})=>(match.stage??"PRELIMINARY")==="PRELIMINARY");
  const preliminaryCompleted=preliminaryMatches.length>0&&preliminaryMatches.every(match=>Boolean(match.match_results));
  const canGenerateFinal=league.status==="IN_PROGRESS"&&league.stage_mode==="PRELIMINARY_FINAL"&&!league.finals_generated&&preliminaryCompleted;
  const canComplete=canCompleteLeague({status:league.status,stageMode:league.stage_mode,finalsGenerated:league.finals_generated,totalMatches:league.matches.length,completedMatches});

  return (
    <div className="admin-ops-board">
      {canGenerateFinal?<form className="ops-complete-form ops-final-form" action={generateFinalStage.bind(null,leagueId)}><button type="submit"><Layers3/>본선 그룹 구성</button></form>:canComplete?<form className="ops-complete-form" action={completeLeagueFromOps.bind(null,leagueId)}><button type="submit"><CheckCircle2/>리그 종료</button></form>:<Link className="ops-exit-link" href="/admin"><ArrowLeft /> 관리자 화면</Link>}
      <OpsBoard readOnly={false} league={league} finalizedSeason={!!season?.finalized_at} />
    </div>
  );
}
