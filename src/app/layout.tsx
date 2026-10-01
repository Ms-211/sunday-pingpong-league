import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { LayoutDashboard, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ServiceWorkerRegistration } from "./service-worker-registration";

export const metadata:Metadata={
  metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000"),
  title:"조&애플 일요리그",
  description:"일요일 탁구 풀리그 운영과 기록",
  openGraph:{
    title:"조&애플 일요리그",
    description:"탁구 대진표 · 경기 결과 확인",
    url:"/",
    type:"website",
    locale:"ko_KR",
    images:[{url:"/og-image.png",width:1774,height:887,alt:"조&애플 일요리그"}],
  },
  twitter:{
    card:"summary_large_image",
    title:"조&애플 일요리그",
    description:"탁구 대진표 · 경기 결과 확인",
    images:["/og-image.png"],
  },
  manifest:"/manifest.webmanifest",
  icons:{icon:[
    {url:"/icons/pwa-192.png",sizes:"192x192",type:"image/png"},
    {url:"/icons/pwa-512.png",sizes:"512x512",type:"image/png"},
  ]},
};

export const viewport:Viewport={width:"device-width",initialScale:1,themeColor:"#2563eb"};

export default async function Layout({children}:{children:React.ReactNode}){
  const db = await createClient();
  const { data: { user } } = await db?.auth.getUser() ?? { data: { user: null } };
  return <html lang="ko"><body>
    <ServiceWorkerRegistration/>
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="site-logo" href="/" aria-label="조앤애플 일요리그 홈">
          <span className="logo-mascot" aria-hidden="true">🏓</span>
          <span><strong><em>조</em>&amp;<b>애플</b></strong><small>일요리그</small></span>
        </Link>
        <Link className={user ? "admin-login-link admin-return-link" : "admin-login-link"} href={user ? "/admin" : "/admin/login"} aria-label={user ? "관리자 화면" : "관리자 로그인"}>{user ? <LayoutDashboard size={20}/> : <LogIn size={20}/>}<span>{user ? "관리자" : "관리자 로그인"}</span></Link>
      </div>
    </header>
    {children}
  </body></html>
}
