import Link from "next/link";
import { CompactRecords } from "@/components/CompactRecords";
import { CalendarDays, Check, ChevronRight, Flame, Gamepad2, Medal, Sparkles, Trophy, Users, UserRound } from "lucide-react";
import { formatPlayerName } from "@/lib/format";
import { awardLabels, getSeasonStats, seasonStatus, statusLabels, type Pair, type Season } from "@/lib/statistics";
import type { getStatisticsData } from "@/lib/statistics-data";
import { SeasonSelect } from "@/components/SeasonSelect";
import { PlayerRecordsPanel, type PlayerRecord } from "@/components/PlayerRecordsTable";
export type StatisticsData = Awaited<ReturnType<typeof getStatisticsData>> & { admin?: boolean };
export function PlayerLink({ id, data }: { id: string; data: StatisticsData }) {
  const p = data.people.get(id);
  return <Link href={`${data.admin ? "/admin" : ""}/players/${id}`}>{p ? formatPlayerName(p.name, p.division) : "선수 기록"}</Link>;
}
export function SeasonPicker({ data, season, career = false, includeCareer = career, seasons = data.seasons }: { data: StatisticsData; season?: Season; career?: boolean; includeCareer?: boolean; seasons?: Season[] }) {
  return <SeasonSelect seasons={seasons.map(({ id, name }) => ({ id, name }))} value={career ? "career" : season?.id} career={includeCareer}/>;
}
export function SeasonBadge({ season }: { season: Season }) {
  const status = seasonStatus(season);
  return <span className={`season-state state-${status.toLowerCase()}`}><i/>{statusLabels[status]}</span>;
}
export function SeasonMetrics({ players, leagues, games }: { players: number; leagues: number; games: number }) {
  return <div className="season-metrics">{[{label:"참가 선수",value:players,unit:"명",icon:Users,tone:"blue"},{label:"완료 리그",value:leagues,unit:"회",icon:Trophy,tone:"red"},{label:"완료 경기",value:games,unit:"경기",icon:Gamepad2,tone:"violet"}].map(({label,value,unit,icon:Icon,tone}) => <article key={label}><span className={`metric-icon ${tone}`}><Icon size={23}/></span><div><span>{label}</span><strong>{value.toLocaleString()}<small>{unit}</small></strong></div></article>)}</div>;
}
export function PairRecords({ pairs, data, limit }: { pairs: Pair[]; data: StatisticsData; limit?: number }) {
  if (!pairs.length) return <p className="muted">아직 해당 기록이 없습니다.</p>;
  const list = (items: Pair[]) => <ul className="stats-list">{items.map(p => <li key={`${p.a}-${p.b}`}><PlayerLink id={p.a} data={data}/> ↔ <PlayerLink id={p.b} data={data}/><p>{p.games}경기 · {p.aWins}승 : {p.bWins}승</p></li>)}</ul>;
  return <>{list(limit ? pairs.slice(0, limit) : pairs)}{limit && pairs.length > limit && <details className="pair-more"><summary>외 {pairs.length - limit}개 기록 보기</summary>{list(pairs.slice(limit))}</details>}</>;
}
function FrequentPairs({ pairs, data }: { pairs: Pair[]; data: StatisticsData }) {
  if (!pairs.length) return <p className="highlight-empty">아직 해당 기록이 없습니다.</p>;
  return <div className="frequent-pairs">{pairs.slice(0,5).map((pair,index)=><div key={`${pair.a}-${pair.b}`}><span>{index+1}</span><strong><PlayerLink id={pair.a} data={data}/> ↔ <PlayerLink id={pair.b} data={data}/></strong><b>{pair.games}경기</b></div>)}</div>;
}
function BalancedPairs({ pairs, data }: { pairs: Pair[]; data: StatisticsData }) {
  if (!pairs.length) return <p className="highlight-empty">아직 해당 기록이 없습니다.</p>;
  return <div className="balanced-pairs">{pairs.slice(0,3).map(pair=><div key={`${pair.a}-${pair.b}`}><strong><PlayerLink id={pair.a} data={data}/> ↔ <PlayerLink id={pair.b} data={data}/></strong><p>{pair.games}경기 · {pair.aWins}승 : {pair.bWins}승</p></div>)}</div>;
}
export function AwardCards({ data, season, preview = false }: { data: StatisticsData; season: Season; preview?: boolean }) {
  const stats = getSeasonStats(data.leagues, season.id);
  const finalized = !!season.finalized_at && !preview;
  const awards = finalized ? data.awards.filter(a => a.season_id === season.id) : stats.awards;
  return <div className="season-awards">{(Object.keys(awardLabels) as (keyof typeof awardLabels)[]).map(type => {
    const winners = awards.filter(a => a.award_type === type);
    const Icon = type === "CHAMPION" ? Trophy : type === "ATTENDANCE_KING" ? CalendarDays : Flame;
    return <article className={`season-award award-${type.toLowerCase()}`} key={type}>
      <header><span className="award-symbol"><Icon size={25}/></span><span className="award-category">{awardLabels[type].split(" ").slice(1).join(" ")}</span>{winners.length > 1 && <span className="joint-award">공동</span>}</header>
      <Icon className="award-watermark" size={114} strokeWidth={1}/>
      <CompactRecords className="award-people">{winners.map(a => <div key={a.player_id}><strong><PlayerLink id={a.player_id} data={data}/></strong><p>{type === "ATTENDANCE_KING" ? <><b>{a.value}</b> / {stats.leagues.length}회 참가</> : type === "CHAMPION" ? <>우승 <b>{a.value}</b>회</> : <><b>{a.value}</b>승</>}</p></div>)}{!winners.length && <div className="award-waiting"><strong>첫 기록을 기다려요</strong><p>완료된 리그의 기록이 모이면 표시됩니다.</p></div>}</CompactRecords>
      <footer>{finalized ? <Check size={14}/> : <span className="leader-dot"/>}<span>{finalized ? `${season.name} 수상` : winners.length ? "현재 선두 · 시즌 종료 후 확정" : "아직 해당 기록이 없습니다."}</span></footer>
    </article>;
  })}</div>;
}
function CareerWinners({ data, leagues }: { data: StatisticsData; leagues: ReturnType<typeof getSeasonStats>["leagues"] }) {
  return <section className="card career-winner-history"><div className="season-section-heading"><div><h2><Trophy size={22}/>회차별 역대 우승자</h2><p>완료된 리그의 우승 기록입니다.</p></div></div><div>{[...leagues].reverse().map(league=>{const winners=league.league_standings.filter(row=>row.rank===1);return <p key={league.id}><span>제{league.round_number}회 <small>{league.league_date}</small></span><strong>{winners.length?winners.map((row,index)=><span key={row.player_id}>{index>0&&", "}<PlayerLink id={row.player_id} data={data}/></span>):"-"}</strong></p>})}</div></section>;
}
export function SeasonStatistics({ data, season, career = false, admin = false, seasons = data.seasons }: { data: StatisticsData; season?: Season; career?: boolean; admin?: boolean; seasons?: Season[] }) {
  data.admin = admin;
  const stats = getSeasonStats(data.leagues, career ? undefined : season?.id);
  const playerRows=(players:typeof stats.players):PlayerRecord[]=>players.map(player=>({...player,affiliation:data.people.get(player.id)?.affiliation??null}));
  const periods=seasons.map(item=>({id:item.id,name:item.name,rows:playerRows(getSeasonStats(data.leagues,item.id).players)}));
  if(admin)periods.push({id:"career",name:"전체 통계",rows:playerRows(getSeasonStats(data.leagues).players)});
  const first=stats.leagues[0],last=stats.leagues.at(-1);
  return <div className={`season-page season-dashboard${admin ? " admin-page" : ""}`}><header className="season-page-heading"><div><div className="season-breadcrumb"><Link href="/">홈</Link><ChevronRight size={14}/>기록·통계</div><h1>함께 쌓아가는, 일요리그 기록</h1><p>{career?"지금까지 쌓인 리그 기록을 한눈에 확인하세요.":"이번 시즌의 주인공과 우리들의 빛나는 순간을 만나보세요."}</p></div></header>
    <section className="season-overview"><div className="season-overview-copy"><span className="season-eyebrow">조&amp;애플 일요리그</span><div><h2>{career?"전체 통계":season?.name}</h2>{season&&<SeasonBadge season={season}/>}</div><p><CalendarDays size={16}/>{career?(first&&last?`${first.league_date.replaceAll("-", ".")} — ${last.league_date.replaceAll("-", ".")}`:"완료된 리그 없음"):`${season?.start_date.replaceAll("-", ".")} — ${season?.end_date.replaceAll("-", ".")}`}</p></div><div className="season-hero-mark" aria-hidden="true"><Trophy size={65} strokeWidth={1.35}/><Sparkles size={23}/></div><SeasonMetrics players={stats.players.length} leagues={stats.leagues.length} games={stats.games}/></section>
    {!career&&season&&<section><div className="season-section-heading"><div><h2><Medal size={23}/>공식 시즌 타이틀</h2><p>{season.finalized_at ? "한 시즌을 빛낸 주인공들을 소개합니다." : "가장 뜨거운 세 가지 기록, 지금의 선두를 확인하세요."}</p></div><span className="season-section-note">동점일 경우 공동 수상</span></div><AwardCards data={data} season={season}/></section>}
    <section className="season-highlight-section"><div className="season-section-heading"><div><h2><Sparkles size={22}/>{career?"통산":"시즌"} 하이라이트</h2><p>승패 너머, 기록 속에서 발견한 재미있는 순간들.</p></div></div><div className="season-highlights">
      {([['undefeated','💯 전승 우승','무패로 우승한 선수'],['runnersUp','🥈 준우승 최다','준우승이 가장 많은 선수'],['fullSets','😱 풀세트 장인','풀세트가 가장 많은 선수'],['cleanWins','🧹 깔끔한 승리','무실세트 승리가 많은 선수'],['streak','🔁 연속 우승','최다 연속 우승 기록']] as const).map(([field,label,description]) => <article className="card highlight-card" key={field}><div className="highlight-heading"><span aria-hidden="true">{label.split(" ")[0]}</span><div><h3>{label.split(" ").slice(1).join(" ")}</h3><p>{description}</p></div></div><CompactRecords className="highlight-values">{stats.highlights[field].length ? stats.highlights[field].map(p => <div key={p.id}><PlayerLink id={p.id} data={data}/><strong>{p[field]}<small>회</small></strong></div>) : <p className="highlight-empty">아직 해당 기록이 없습니다.</p>}</CompactRecords></article>)}
      <article className="card highlight-card pair-highlight-card"><div className="highlight-heading"><span>🤝</span><div><h3>가장 많이 만난 두 선수</h3><p>대진표에서 자주 마주친 반가운 얼굴들</p></div></div><FrequentPairs data={data} pairs={stats.highlights.frequent}/></article>
      <article className="card highlight-card pair-highlight-card"><div className="highlight-heading"><span>⚖</span><div><h3>가장 팽팽한 상대</h3><p>두 번 이상 맞붙은, 한 끗 차이의 승부</p></div></div><BalancedPairs data={data} pairs={stats.highlights.balanced}/></article>
    </div></section>
    {career&&<CareerWinners data={data} leagues={stats.leagues}/>} {!career&&<div className="season-events"><section className="card season-event"><div className="season-section-heading"><div><h2><UserRound size={25}/>이번 시즌 새 얼굴</h2><p>첫 번째 리그를 완료한 선수만 표시됩니다.</p></div><span className="event-count">{stats.newcomers.length}명</span></div><div className="season-names">{stats.newcomers.map(p => <span className="newcomer-chip" key={p.id}><PlayerLink id={p.id} data={data}/></span>)}</div>{!stats.newcomers.length && <p className="event-empty">이번 시즌 새 얼굴이 아직 없습니다.</p>}</section>
    <section className="card season-event"><div className="season-section-heading"><div><h2><Trophy size={25}/>이번 시즌 첫 우승</h2><p>잊지 못할 첫 번째 트로피의 순간.</p></div></div><ol className="season-timeline">{stats.firstWins.map(p => <li key={p.id}><span>제{p.league.round_number}회</span><time>{p.league.league_date}</time><p><PlayerLink id={p.id} data={data}/><small>생애 첫 우승</small></p></li>)}</ol>{!stats.firstWins.length && <p className="event-empty">아직 첫 우승 기록이 없습니다.</p>}</section></div>}
    <PlayerRecordsPanel periods={periods} initialPeriod={career?"career":season?.id??periods[0]?.id??""} admin={admin}/>
  </div>;
}
