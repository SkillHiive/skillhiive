import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
// @ts-expect-error the bundler is a plain .mjs script without types
import { buildBundle } from "../../../scripts/bundle-cue-sync.mjs";

const BUNDLE_PATH = join(__dirname, "..", "..", "functions-bundled", "cue-sync", "index.ts");
const committed = readFileSync(BUNDLE_PATH, "utf8");

describe("cue-sync single-file bundle", () => {
  it("is exactly what the bundler builds from the sources (run `pnpm run bundle:functions` if not)", () => {
    expect(committed).toBe(buildBundle());
  });

  it("imports only the Supabase client, with no relative imports left", () => {
    const imports = [...committed.matchAll(/^import .* from "([^"]+)";$/gm)].map((match) => match[1]);
    expect(imports).toEqual(["https://esm.sh/@supabase/supabase-js@2"]);
    expect(committed).not.toMatch(/(?:from|import)\s*\(?\s*"\.{1,2}\//);
  });

  it("declares nothing twice when the two files are joined", () => {
    const file = "bundle.ts";
    const host = ts.createCompilerHost({});
    const original = host.getSourceFile.bind(host);
    host.getSourceFile = (name, languageVersion) =>
      name === file ? ts.createSourceFile(name, committed, languageVersion) : original(name, languageVersion);
    host.fileExists = (name) => name === file;
    host.readFile = (name) => (name === file ? committed : undefined);
    const program = ts.createProgram([file], { noResolve: true, noLib: true, types: [], target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }, host);
    // 2300 duplicate identifier, 2451 cannot redeclare block-scoped variable, 2393 duplicate function implementation.
    const duplicates = ts.getPreEmitDiagnostics(program).filter((d) => [2300, 2451, 2393].includes(d.code));
    expect(duplicates.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"))).toEqual([]);
    expect(program.getSyntacticDiagnostics().length).toBe(0);
  });

  it("serves requests when run with Deno and the Supabase client stubbed", async () => {
    const js = ts.transpileModule(committed, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    let handler: ((request: Request) => Promise<Response>) | null = null;
    const env: Record<string, string> = { SUPABASE_URL: "http://stub", SUPABASE_SERVICE_ROLE_KEY: "stub", CUE_LINK_ORIGIN: "https://skillhiive.test" };
    const fakeDeno = { env: { get: (name: string) => env[name] }, serve: (fn: typeof handler) => { handler = fn; } };
    const fakeRequire = (name: string) => {
      if (name === "https://esm.sh/@supabase/supabase-js@2") return { createClient: () => ({}) };
      throw new Error("unexpected import " + name);
    };
    new Function("require", "exports", "Deno", js)(fakeRequire, {}, fakeDeno);
    expect(handler).not.toBeNull();

    const call = async (path: string, body: unknown, headers: Record<string, string> = {}) => {
      const response = await handler!(new Request("https://x.test/functions/v1/cue-sync" + path, {
        method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body),
      }));
      return { status: response.status, body: (await response.json()) as { error: { code: string } } };
    };
    // None of these touch the database, so the empty client is enough.
    expect((await call("/v1/link/start", {})).status).toBe(422);
    expect((await call("/v1/nope", {})).body.error.code).toBe("not_found");
    const unsigned = await call("/v1/days", {}, { "x-cue-device": "not-a-device" });
    expect([unsigned.status, unsigned.body.error.code]).toEqual([401, "unknown_device"]);
  });
});
