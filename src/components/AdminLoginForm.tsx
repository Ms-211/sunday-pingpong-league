"use client";

import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { useState } from "react";
import { login } from "@/app/actions";

export function AdminLoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form className="login-form" action={login}>
      <label>
        <UserRound />
        <input name="email" type="email" placeholder="아이디 (이메일)" required autoComplete="username" />
      </label>
      <label>
        <LockKeyhole />
        <input name="password" type={showPassword ? "text" : "password"} placeholder="비밀번호" minLength={6} required autoComplete="current-password" />
        <button type="button" aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"} onClick={() => setShowPassword((value) => !value)}>
          {showPassword ? <EyeOff /> : <Eye />}
        </button>
      </label>
      <button className="login-submit">로그인</button>
    </form>
  );
}
