import { FlatCompat } from "@eslint/eslintrc";
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
const config = [{ ignores: ["public-release/**", "private-backup/**", ".pnpm-store/**", ".next/**", ".next-dev/**", "dist/**", ".vinext/**", ".wrangler/**", "node_modules/**", "next-env.d.ts"] }, ...compat.extends("next/core-web-vitals", "next/typescript"), { files: ["src/app/actions.ts"], rules: { "@typescript-eslint/ban-ts-comment": "off" } }];
export default config;
