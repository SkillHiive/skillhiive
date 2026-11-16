import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Tests run in Node, except component tests (src/**/*.test.tsx), which get jsdom.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    environmentMatchGlobs: [["src/**/*.test.tsx", "jsdom"]],
    include: ["src/**/*.test.{ts,tsx}", "supabase/functions/**/*.test.ts"],
    globals: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@skillhiive/contracts": path.resolve(__dirname, "../../packages/contracts/src"),
      // The brand package's entry is index.ts at its root, not under src/.
      "@skillhiive/brand": path.resolve(__dirname, "../../packages/brand/index.ts"),
      "@skillhiive/client": path.resolve(__dirname, "../../packages/client/src"),
      "@skillhiive/core": path.resolve(__dirname, "../../packages/core/src"),
      "@skillhiive/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@skillhiive/i18n": path.resolve(__dirname, "../../packages/i18n/src"),
    },
  },
});
