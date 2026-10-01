"use client";

import Link from "next/link";
import { Search, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDivision } from "@/lib/format";

export function PlayerSelect({ players }: { players: { id: string; name: string; affiliation?: string | null; division: string | null }[] }) {
  const [query,setQuery]=useState("");
  const [recent,setRecent]=useState<typeof players>([]);
  useEffect(()=>{try{const ids=JSON.parse(localStorage.getItem("recent-player-searches")??"[]") as string[];setRecent(ids.map(id=>players.find(player=>player.id===id)).filter((player):player is typeof players[number]=>Boolean(player)).slice(0,4));}catch{}},[players]);
  const remember=(player:typeof players[number])=>{const next=[player,...recent.filter(item=>item.id!==player.id)].slice(0,4);setRecent(next);localStorage.setItem("recent-player-searches",JSON.stringify(next.map(item=>item.id)));};
  const matches=query.trim()?players.filter(player=>`${player.name} ${player.affiliation??""} ${player.division??""}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0,6):[];
  return <div className="home-player-search"><label><Search size={20}/><span className="sr-only">선수 이름 검색</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="선수 이름을 검색하세요" autoComplete="off"/></label>
    {query&&<div className="home-player-results">{matches.length?matches.map(player=><Link href={`/players/${player.id}`} key={player.id} onClick={()=>remember(player)}><UserRound size={18}/><strong>{player.name}</strong><span>{[player.affiliation,formatDivision(player.division)].filter(Boolean).join(" · ")}</span></Link>):<p>일치하는 선수가 없습니다.</p>}</div>}
    {recent.length>0&&<div className="home-recent-players"><p>최근 검색한 선수</p><div>{recent.map(player=><Link href={`/players/${player.id}`} key={player.id} onClick={()=>remember(player)}>{player.name}</Link>)}</div></div>}
  </div>;
}
