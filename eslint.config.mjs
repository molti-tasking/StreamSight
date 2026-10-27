import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "backend/rust_wasm_module/pkg/**",
    "backend/rust_wasm_module/pkg-node/**",
    "backend/rust_wasm_module/target/**",
  ]),
]);
