"use client";
import Link from "next/link";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, Pencil, Plus, Search, Trash2, UserPlus, Users } from "lucide-react";
import { savePlayer } from "@/app/actions";

type Player={id:string;name:string;affiliation:string|null;division:string|null;is_active:boolean;created_at:string;updated_at:string};
type Editing={id?:string;name:string;affiliation:string;division:string;isActive:boolean};
const emptyPlayer:Editing={name:"",affiliation:"",division:"",isActive:true};
const collator=new Intl.Collator("ko",{numeric:true,sensitivity:"base"});

export function PlayersManager({initialPlayers}:{initialPlayers:Player[]}){
  const router=useRouter();
  const[query,setQuery]=useState("");
  const[status,setStatus]=useState<"all"|"active"|"inactive">("all");
  const[page,setPage]=useState(1);
  const[pageSize,setPageSize]=useState(10);
  const[sort,setSort]=useState<{key:"name"|"division";direction:"asc"|"desc"}>({key:"name",direction:"asc"});
  const[editing,setEditing]=useState<Editing|null>(null);
  const[pending,startTransition]=useTransition();
  const activeCount=initialPlayers.filter(p=>p.is_active).length;
  const filtered=useMemo(()=>initialPlayers.filter(player=>{
    const matches=`${player.name} ${player.affiliation??""} ${player.division??""}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesStatus=status==="all"||(status==="active"?player.is_active:!player.is_active);
    return matches&&matchesStatus;
  }),[initialPlayers,query,status]);
  const sorted=useMemo(()=>[...filtered].sort((a,b)=>{
    const comparison=collator.compare(sort.key==="name"?a.name:a.division??"",sort.key==="name"?b.name:b.division??"");
    return sort.direction==="asc"?comparison:-comparison;
  }),[filtered,sort]);
  const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));
  const safePage=Math.min(page,totalPages);
  const visible=sorted.slice((safePage-1)*pageSize,safePage*pageSize);

  function submit(formData:FormData){startTransition(async()=>{await savePlayer(formData);setEditing(null);router.refresh();});}
  function toggle(player:Player){const form=new FormData();form.set("id",player.id);form.set("name",player.name);form.set("affiliation",player.affiliation??"");form.set("division",player.division??"");form.set("is_active",String(!player.is_active));submit(form);}
  function changeSearch(value:string){setQuery(value);setPage(1)}
  function changeSort(key:"name"|"division"){setSort(current=>({key,direction:current.key===key&&current.direction==="asc"?"desc":"asc"}));setPage(1)}

  return <div className="players-page admin-page">
    <header className="players-header admin-page-header"><div><h1>선수 관리</h1><p><span>홈</span><ChevronRight/>선수 관리</p></div><div><button className="new-player-button" onClick={()=>setEditing(emptyPlayer)}><Plus/>새 선수 추가</button></div></header>

    <section className="player-toolbar">
      <div className="player-counts"><article><small>전체 선수</small><strong>{initialPlayers.length}<em>명</em></strong></article><article><span className="active"><Users/></span><div><small>활성 선수</small><strong>{activeCount}<em>명</em></strong></div></article><article><span><Users/></span><div><small>비활성 선수</small><strong>{initialPlayers.length-activeCount}<em>명</em></strong></div></article></div>
      <div className="player-filters"><label><Search/><input aria-label="선수 검색" placeholder="이름·소속·부수 검색" value={query} onChange={e=>changeSearch(e.target.value)}/></label><label className="status-filter"><Filter/><select aria-label="상태 필터" value={status} onChange={e=>{setStatus(e.target.value as typeof status);setPage(1)}}><option value="all">전체</option><option value="active">활성</option><option value="inactive">비활성</option></select><ChevronDown/></label></div>
    </section>

    <section className="players-table-card"><div className="players-table-wrap"><table className="players-table"><thead><tr><th><input type="checkbox" aria-label="전체 선택"/></th><th><button type="button" aria-label={`선수명 ${sort.key==="name"&&sort.direction==="asc"?"역순":"가나다순"} 정렬`} className={`player-sort ${sort.key==="name"?"active":""}`} onClick={()=>changeSort("name")}>선수명{sort.key==="name"?(sort.direction==="asc"?<ArrowUp/>:<ArrowDown/>):<ArrowUpDown/>}</button></th><th>소속</th><th><button type="button" aria-label={`부수 ${sort.key==="division"&&sort.direction==="asc"?"내림차순":"오름차순"} 정렬`} className={`player-sort ${sort.key==="division"?"active":""}`} onClick={()=>changeSort("division")}>부수{sort.key==="division"?(sort.direction==="asc"?<ArrowUp/>:<ArrowDown/>):<ArrowUpDown/>}</button></th><th>표시명</th><th>상태</th><th>등록일</th><th>관리</th></tr></thead><tbody>{visible.map(player=><tr key={player.id}><td><input type="checkbox" aria-label={`${player.name} 선택`}/></td><td><strong><Link href={`/admin/players/${player.id}`}>{player.name}</Link></strong></td><td>{player.affiliation??"-"}</td><td>{player.division??"-"}</td><td>{player.division?`${player.name}(${player.division})`:player.name}</td><td><span className={`player-status ${player.is_active?"active":"inactive"}`}>{player.is_active?"활성":"비활성"}</span></td><td>{new Intl.DateTimeFormat("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(player.created_at)).replaceAll(". ",".").replace(/\.$/,"")}</td><td><div className="player-actions"><button aria-label={`${player.name} 수정`} onClick={()=>setEditing({id:player.id,name:player.name,affiliation:player.affiliation??"",division:player.division??"",isActive:player.is_active})}><Pencil/></button><button className={player.is_active?"deactivate":"activate"} aria-label={`${player.name} ${player.is_active?"비활성화":"활성화"}`} onClick={()=>toggle(player)} disabled={pending}>{player.is_active?<Trash2/>:<UserPlus/>}</button></div></td></tr>)}</tbody></table>{!visible.length&&<div className="players-empty"><Users/><strong>검색된 선수가 없습니다</strong><p>검색어나 필터를 변경해 보세요.</p></div>}</div>
      <footer className="players-pagination"><span>전체 {filtered.length}명</span><div><button onClick={()=>setPage(1)} disabled={safePage===1}><ChevronsLeft/></button><button onClick={()=>setPage(Math.max(1,safePage-1))} disabled={safePage===1}><ChevronLeft/></button>{Array.from({length:Math.min(5,totalPages)},(_,i)=>{const start=Math.max(1,Math.min(safePage-2,totalPages-4));const number=start+i;return number<=totalPages?<button key={number} className={number===safePage?"active":""} onClick={()=>setPage(number)}>{number}</button>:null})}<button onClick={()=>setPage(Math.min(totalPages,safePage+1))} disabled={safePage===totalPages}><ChevronRight/></button><button onClick={()=>setPage(totalPages)} disabled={safePage===totalPages}><ChevronsRight/></button></div><label><select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1)}}><option value="10">10개씩 보기</option><option value="20">20개씩 보기</option><option value="50">50개씩 보기</option></select><ChevronDown/></label></footer>
    </section>

    {editing&&<div className="player-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)setEditing(null)}}><section className="player-modal" role="dialog" aria-modal="true" aria-labelledby="player-modal-title"><div><span><UserPlus/></span><h2 id="player-modal-title">{editing.id?"선수 정보 수정":"새 선수 추가"}</h2><p>선수 이름과 소속, 부수를 입력해주세요.</p></div><form action={submit}><input type="hidden" name="id" value={editing.id??""}/><input type="hidden" name="is_active" value={String(editing.isActive)}/><label>선수명<input name="name" required maxLength={50} value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})} placeholder="예: 샘플선수010"/></label><label>소속<input name="affiliation" maxLength={50} value={editing.affiliation} onChange={e=>setEditing({...editing,affiliation:e.target.value})} placeholder="예: 애플"/></label><label>부수<input name="division" maxLength={20} value={editing.division} onChange={e=>setEditing({...editing,division:e.target.value})} placeholder="예: 7"/></label><label className="active-checkbox"><input type="checkbox" checked={editing.isActive} onChange={e=>setEditing({...editing,isActive:e.target.checked})}/>활성 선수</label><div><button type="button" onClick={()=>setEditing(null)}>취소</button><button disabled={pending}>{pending?"저장 중…":editing.id?"수정 완료":"선수 추가"}</button></div></form></section></div>}
  </div>;
}
