import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".netlify/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Global overrides: downgrade strict TypeScript rules that are impractical
  // across this codebase (Supabase dynamic data, third-party API integrations).
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "react-hooks/set-state-in-effect": "warn",
      // The react-compiler ref-during-render rule fires false positives when
      // passing ref objects (not ref.current) as JSX props — a valid pattern.
      "react-compiler/react-compiler": "warn",
      // OAuth flows and API redirects require full-page navigation via <a>.
      // These are not Next.js pages, so the rule is a false positive.
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
  // Disable no-explicit-any for API routes and lib files where dynamic
  // Supabase payloads and third-party types make 'any' unavoidable.
  {
    files: ["src/app/api/**/*.ts", "src/lib/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
