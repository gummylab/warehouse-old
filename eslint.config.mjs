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
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Test runs: the e2e server writes its own Next build output, database and
    // uploads under tests/.tmp (see playwright.config.ts), and Playwright
    // writes its report and traces next to it. None of it is source.
    "tests/.tmp/**",
    "test-results/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
