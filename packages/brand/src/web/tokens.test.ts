import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { generateAllCSSVariables } from "./cssVariables";

const HEADER =
  "/* Generated from the brand tokens. Run the brand tests with UPDATE_TOKENS_CSS=1 to refresh. */\n";
const cssPath = fileURLToPath(new URL("./tokens.css", import.meta.url));

describe("tokens.css", () => {
  it("matches the stylesheet generated from the tokens", () => {
    const generated = HEADER + generateAllCSSVariables();
    if (process.env["UPDATE_TOKENS_CSS"] === "1") writeFileSync(cssPath, generated);
    expect(readFileSync(cssPath, "utf8")).toBe(generated);
  });

  it("defines the variables the web theme reads", () => {
    const css = readFileSync(cssPath, "utf8");
    for (const name of ["--color-bg-canvas", "--color-text-primary", "--color-surface-primary", "--color-tint-primary"]) {
      expect(css).toContain(name + ":");
    }
  });
});
