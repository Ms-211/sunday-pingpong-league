import Link from "next/link";
import { CalendarDays, ChevronRight, Flame, Gamepad2, Search, Trophy, Users } from "lucide-react";
import { getPublicHomeLeagues } from "@/lib/data";
import { leagueTitle } from "@/lib/format";
import { awardLabels, getSeasonStats } from "@/lib/statistics";
import { getStatisticsData, selectedSeason } from "@/lib/statistics-data";
import { PlayerSelect } from "@/components/PlayerSelect";
import { SeasonSelect } from "@/components/SeasonSelect";

export const dynamic="force-dynamic";

function dateText(value:string){
  return new Intl.DateTimeFormat("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit",weekday:"short"}).format(new Date(`${value}T00:00:00`));
}

export default async function Home({ searchParams }: { searchParams: Promise<{ season?: string }> }){
  const [leagues,records,query]=await Promise.all([getPublicHomeLeagues(),getStatisticsData(),searchParams]);
  const active=leagues.find((league)=>league.status==="IN_PROGRESS");
  const completed=leagues.filter((league)=>league.status==="COMPLETED").slice(0,3);
  const participantCount=active?.league_participants?.[0]?.count??0;
  const matchCount=active?.matches?.length??0;
  const completedMatchCount=active?.matches?.filter((match)=>Boolean(match.match_results)).length??0;
  const progress=matchCount?Math.round(completedMatchCount/matchCount*100):0;
  const season=selectedSeason(records.seasons,query.season);
  const players=[...records.people.values()].sort((a,b)=>a.name.localeCompare(b.name,"ko"));
  const seasonStats=season?getSeasonStats(records.leagues,season.id):undefined;
  const titleAwards=season?(season.finalized_at?records.awards.filter(award=>award.season_id===season.id):seasonStats?.awards??[]):[];
  const titleTypes=["CHAMPION","ATTENDANCE_KING","WIN_KING"] as const;

  return <main className="public-home">
    <section className="home-hero">
      <div className="hero-copy">
        <h1>오늘도 즐거운 <span>일요리그!</span> <span className="title-paddle" aria-hidden="true">🏓</span></h1>
        <p>진행 중인 리그를 선택해주세요.</p>
      </div>
      <div className="hero-mascot" role="img" aria-label="조앤애플 일요리그 마스코트 이미지 영역"/>
    </section>

    <div className="home-content">
      {active?<section className="active-league-card">
        <div className="active-league-info">
          <span className="live-pill"><i/>진행 중</span>
          <h2>{leagueTitle(active.round_number)}</h2>
          <div className="league-meta">
            <span><CalendarDays size={22}/>{dateText(active.league_date)}</span>
            <span><Users size={22}/>참가자 {participantCount}명</span>
            <span><Gamepad2 size={22}/>{completedMatchCount} / {matchCount} 경기</span>
          </div>
          <div className="home-progress-row">
            <div className="home-progress"><span style={{width:`${progress}%`}}/></div>
            <b>{progress}% 진행</b>
          </div>
        </div>
        <Link className="view-league-button" href={`/leagues/${active.id}`}>리그 보기<ChevronRight size={26}/></Link>
      </section>:<section className="active-league-card empty-active-card">
        <div><span className="waiting-pill">다음 리그 준비 중</span><h2>현재 진행 중인 리그가 없어요</h2><p>새 리그가 시작되면 경기 현황과 실시간 순위를 이곳에서 확인할 수 있어요.</p></div>
      </section>}

      <section className="home-records">
        <aside className="home-player-lookup"><div className="home-lookup-heading"><span>PLAYER SEARCH</span><h2>내 기록 찾기</h2><p>이름을 선택하면 시즌별·통산 기록을<br/>확인할 수 있어요.</p></div><span className="home-lookup-symbol"><Search size={48}/></span><PlayerSelect players={players}/></aside>
        <div className="home-official-titles"><header><div><h2><Trophy size={24}/>공식 시즌 타이틀</h2><p>{season?.finalized_at?"확정된 시즌의 챔피언과 기록 보유자입니다.":"현재 선두 기록이며 시즌 종료 후 확정됩니다."}</p></div>{season&&<div className="home-title-controls"><Link className="home-statistics-link" href={`/statistics?season=${season.id}`}>시즌 기록 전체 보기<ChevronRight size={18}/></Link><SeasonSelect seasons={records.seasons.map(({id,name})=>({id,name}))} value={season.id} career={false}/></div>}</header>
          {season?<div className="home-title-grid">{titleTypes.map((type,index)=>{const winners=titleAwards.filter(award=>award.award_type===type);const Icon=index===0?Trophy:index===1?CalendarDays:Flame;const field=index===0?"championships":index===1?"appearances":"wins";const sorted=[...(seasonStats?.players??[])].filter(player=>player[field]>0).sort((a,b)=>b[field]-a[field]||a.name.localeCompare(b.name,"ko"));const leaders=season.finalized_at?winners.map(award=>({rank:1,name:records.people.get(award.player_id)?.name??"선수",value:award.value})):sorted.map(player=>({rank:sorted.findIndex(item=>item[field]===player[field])+1,name:player.name,value:player[field]})).filter(player=>player.rank<=3);return <article className={`home-title-${type.toLowerCase()}`} key={type}><div><span className="home-title-eyebrow">{["CHAMPION","ATTENDANCE","MOST WINS"][index]}</span><h3>{awardLabels[type].split(" ").slice(1).join(" ")}</h3></div><span className="home-title-icon"><Icon size={28}/></span><div className="home-title-leaders">{leaders.length?leaders.map(leader=><div key={`${leader.rank}-${leader.name}`}><span>{leader.rank}<small>위</small></span><strong>{leader.name}</strong><b>{leader.value}<small>{type==="WIN_KING"?"승":"회"}</small></b></div>):<p>기록 없음</p>}</div></article>})}</div>:<div className="recent-empty">시즌 기록이 아직 없습니다.</div>}
        </div>
      </section>

      <section className="recent-leagues">
        <h2>최근 종료된 리그</h2>
        {completed.length?<div className="recent-list">{completed.map((league)=><div className="recent-row" key={league.id}>
          <span className="round-circle">{league.round_number}</span>
          <strong>{leagueTitle(league.round_number)}</strong>
          <span><CalendarDays size={19}/>{dateText(league.league_date)}</span>
          <span><Users size={19}/>참가자 {league.league_participants?.[0]?.count??0}명</span>
          <Link href={`/leagues/${league.id}`}>결과 보기<ChevronRight size={20}/></Link>
        </div>)}</div>:<div className="recent-empty">아직 종료된 리그가 없어요.</div>}
      </section>
    </div>
  </main>
}
