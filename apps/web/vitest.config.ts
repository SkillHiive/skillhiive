import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@skillhiive/contracts": path.resolve(__dirname, "../../packages/contracts/src"),
      "@skillhiive/brand": path.resolve(__dirname, "../../packages/brand/src"),
      "@skillhiive/client": path.resolve(__dirname, "../../packages/client/src"),
      "@skillhiive/core": path.resolve(__dirname, "../../packages/core/src"),
      "@skillhiive/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@skillhiive/i18n": path.resolve(__dirname, "../../packages/i18n/src"),
    },
  },
});