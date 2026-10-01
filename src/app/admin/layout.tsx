import {redirect}from"next/navigation";
import{createClient}from"@/lib/supabase/server";
import{AdminSidebar}from"@/components/AdminSidebar";

export default async function Layout({children}:{children:React.ReactNode}){
  const db=await createClient();
  const{data:{user}}=await db?.auth.getUser()??{data:{user:null}};
  if(!user)redirect("/admin/login");
  const { data: isAdmin, error } = await db!.rpc("is_admin");
  if(error || !isAdmin)redirect("/admin/login?error=forbidden");
  return <div className="admin-shell"><AdminSidebar email={user.email??"admin@jo-apple.com"}/><main className="admin-main">{children}</main></div>;
}
