"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ClipboardList, History, House, LayoutDashboard, ListChecks, LogOut, Menu, Trophy, Users, X } from "lucide-react";
import { logout } from "@/app/actions";

const nav=[
  {href:"/admin",label:"대시보드",icon:LayoutDashboard,exact:true},
  {href:"/",label:"메인 화면",icon:House,exact:true},
  {href:"/admin/players",label:"선수 관리",icon:Users},
  {href:"/admin/leagues",label:"리그 목록",icon:ListChecks,exact:true},
  {href:"/admin/leagues/new",label:"리그 생성",icon:ClipboardList,exact:true},
  {href:"/admin/statistics",label:"기록·통계",icon:Trophy},
  {href:"/admin/seasons",label:"시즌 관리",icon:History},
];

export function AdminSidebar({email}:{email:string}){
  const pathname=usePathname();
  const [open,setOpen]=useState(false);

  useEffect(()=>{
    if(!open)return;
    const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};
    window.addEventListener("keydown",close);
    return ()=>window.removeEventListener("keydown",close);
  },[open]);

  return <aside className="admin-sidebar">
    <Link href="/admin" className="admin-brand" onClick={()=>setOpen(false)}>
      <span className="admin-brand-mascot"><Trophy size={34}/></span>
      <span><strong><em>조</em>&amp;<b>애플</b></strong><small>일요리그</small></span>
    </Link>
    <button className="admin-menu-toggle" type="button" aria-label={open?"메뉴 닫기":"메뉴 열기"} aria-expanded={open} aria-controls="admin-sidebar-body" onClick={()=>setOpen(value=>!value)}>{open?<X/>:<Menu/>}</button>
    {open&&<button className="admin-menu-backdrop" type="button" aria-label="메뉴 닫기" onClick={()=>setOpen(false)}/>}
    <div id="admin-sidebar-body" className={`admin-sidebar-body${open?" open":""}`}>
      <nav className="admin-nav" aria-label="관리자 메뉴">{nav.map(({href,label,icon:Icon,exact})=>{
        const active=exact?pathname===href:pathname.startsWith(href);
        return <Link key={href} href={href} className={active?"active":""} aria-current={active?"page":undefined} onClick={()=>setOpen(false)}><Icon size={23}/><span>{label}</span></Link>;
      })}</nav>
      <div className="sidebar-cheer"><strong>즐거운 일요리그! 🏓</strong><small>오늘도 화이팅!</small><div className="sidebar-mascot"/></div>
      <div className="admin-profile"><span>👨🏻‍💼</span><div><strong>관리자</strong><small>{email}</small></div><form action={logout}><button title="로그아웃" aria-label="로그아웃"><LogOut size={19}/></button></form></div>
    </div>
  </aside>;
}
