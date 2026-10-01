# 일요 탁구 리그

Next.js · Supabase 기반 탁구 리그 관리 앱입니다. 공개 경기 조회, 관리자 선수·대진 관리, 경기 결과 입력, 시즌 통계를 제공합니다.

이 공개본은 운영 데이터와 기존 저장소 이력을 포함하지 않습니다. 테스트의 샘플선수 이름과 `supabase/seed.sql`의 선수는 가상 데이터입니다.

## 개발 환경

Node.js 24, pnpm 11.19.0을 사용합니다.

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
```

`.env.local`에 별도 개발 프로젝트의 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`(publishable/anon 키), `NEXT_PUBLIC_SITE_URL`을 설정하세요. secret/service-role 키를 `NEXT_PUBLIC_*`에 넣으면 안 됩니다.

## 개발 DB

비어 있는 **별도 개발 Supabase 프로젝트**에서 파일명 순으로 `supabase/migrations/*.sql`을 적용합니다. 이 공개본은 회원 명부·과거 경기 이관·운영 데이터 초기화 SQL을 제외하고 스키마만 제공합니다. 공개본 마이그레이션 이력은 운영본과 다르므로 기존 운영 DB에 처음부터 실행하지 마세요.

SQL Editor를 이용할 때는 다음 명령으로 스키마 파일을 만들 수 있습니다.

```powershell
Get-ChildItem supabase/migrations/*.sql | Sort-Object Name | ForEach-Object {
  Get-Content -LiteralPath $_.FullName -Raw
} | Set-Content -LiteralPath "$env:TEMP/sunday-pingpong-schema.sql" -Encoding utf8
```

Authentication에서 개발 계정을 생성한 후 SQL Editor에서 관리자 역할을 등록하세요.

```sql
insert into public.admin_users(user_id, display_name, role)
values ('AUTH_USER_UUID', '개발 관리자', 'ADMIN');
```

개발 DB에서 `supabase/seed.sql`을 실행하면 가상 선수 8명을 추가할 수 있습니다. 관리자 화면에서 선수와 리그를 직접 만들어도 됩니다.

## 실행과 검증

```powershell
pnpm dev
pnpm test
pnpm lint
pnpm build
pnpm audit
```

기본 개발 주소는 `http://localhost:3000`입니다. `/`·`/statistics`·`/players/[playerId]`는 공개 조회, `/admin`·`/ops/[leagueId]`는 관리자/운영자 전용입니다. `ADMIN`과 `OPERATOR`는 같은 쓰기 권한입니다.

Supabase SQL Editor에서 `supabase/tests/public_security.sql`로 공개 열 권한·Realtime 구성을 확인할 수 있습니다. `supabase/tests/seasons.sql`은 개발 관리자 계정이 있는 개발 DB에서 실행하며 테스트 데이터는 롤백됩니다.

## Cloudflare Workers

```powershell
pnpm build:vinext
pnpm start:vinext
```

배포 환경변수를 별도로 설정한 뒤 `pnpm deploy:vinext`로 배포합니다. 인증·DB 정책·캐시 설정은 각 배포 환경에서 확인해야 합니다. 환경파일, 연결 임시파일, 패키지 캐시는 커밋하지 마세요.

보안 변경과 운영 적용 사항은 [SECURITY.md](SECURITY.md)를 참고하세요.
