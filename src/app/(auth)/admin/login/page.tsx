import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminLoginForm } from "@/components/AdminLoginForm";

const messages: Record<string, string> = {
  forbidden: "관리자 또는 운영자 권한이 필요합니다.",
  config: "Supabase 환경변수가 필요합니다.",
  input: "이메일 형식과 6자 이상의 비밀번호를 확인해 주세요.",
  invalid_credentials: "이메일 또는 비밀번호가 올바르지 않습니다.",
  email_not_confirmed: "이메일 인증이 완료되지 않았습니다.",
  over_request_rate_limit: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  auth: "인증 요청에 실패했습니다.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="login-page">
      <div className="login-decoration login-decoration-red" />
      <div className="login-decoration login-decoration-blue" />
      <section className="login-visual" aria-hidden="true">
        <div className="login-mascot" />
      </section>
      <section className="login-card">
        <Link className="login-back-link" href="/"><ArrowLeft size={18} />홈으로 돌아가기</Link>
        <header>
          <span>조</span>&amp;<b>애플</b>
          <strong>일요리그</strong>
        </header>
        <p className="login-subtitle"><i />🏓<i /></p>
        <p>탁구로 하나되는 즐거운 일요리그</p>
        {error && (
          <p className="login-error" role="alert">
            {messages[error] ?? `인증 오류가 발생했습니다. (${error})`}
          </p>
        )}
        <AdminLoginForm />
        <footer><span />🏓　조&amp;애플 일요리그 운영팀<span /></footer>
      </section>
    </main>
  );
}
