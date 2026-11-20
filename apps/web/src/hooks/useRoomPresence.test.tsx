import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

type Call = { op: string; table?: string; args?: unknown };
const calls: Call[] = [];
let releaseInsert: (() => void) | null = null;
let holdInsert = false;

// A chainable stand-in for the bits of supabase-js the hook uses, recording what it does.
function query(table: string) {
  let op = "select";
  const result = (): Promise<unknown> => {
    calls.push({ op, table });
    if (op === "insert") {
      const answer = { data: { id: "row-1" }, error: null };
      if (holdInsert) return new Promise((r) => (releaseInsert = () => r(answer)));
      return Promise.resolve(answer);
    }
    return Promise.resolve({ data: { id: "row-1" }, error: null });
  };
  const chain = {
    eq: () => chain,
    select: () => chain,
    delete: () => ((op = "delete"), chain),
    insert: () => ((op = "insert"), chain),
    update: () => ((op = "update"), chain),
    single: result,
    then: (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => result().then(ok, bad),
  };
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } }, error: null }) },
    from: (table: string) => query(table),
    rpc: (name: string) => {
      calls.push({ op: "rpc", args: name });
      return Promise.resolve({ error: null });
    },
  },
}));

const { useRoomPresence } = await import("./useRoomPresence");

beforeEach(() => {
  calls.length = 0;
  holdInsert = false;
  releaseInsert = null;
});

describe("useRoomPresence", () => {
  it("writes nothing until there is a room to be in", async () => {
    const { rerender } = renderHook(({ room }) => useRoomPresence(room), {
      initialProps: { room: undefined as string | undefined },
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(calls).toEqual([]);

    rerender({ room: "deep" });
    await waitFor(() => expect(calls.some((c) => c.op === "rpc")).toBe(true));
    expect(calls.filter((c) => c.op === "insert")).toHaveLength(1);
  });

  it("removes the row when the room is cleared", async () => {
    const { rerender } = renderHook(({ room }) => useRoomPresence(room), {
      initialProps: { room: "deep" as string | undefined },
    });
    await waitFor(() => expect(calls.some((c) => c.op === "rpc")).toBe(true));
    const before = calls.filter((c) => c.op === "delete").length;
    rerender({ room: undefined });
    await waitFor(() => expect(calls.filter((c) => c.op === "delete").length).toBe(before + 1));
  });

  it("takes back a row whose insert lands after leaving, and never starts the clock", async () => {
    holdInsert = true;
    const { unmount } = renderHook(() => useRoomPresence("deep"));
    await waitFor(() => expect(releaseInsert).not.toBeNull());
    const before = calls.filter((c) => c.op === "delete").length;
    unmount();
    releaseInsert!();
    await waitFor(() => expect(calls.filter((c) => c.op === "delete").length).toBe(before + 1));
    expect(calls.some((c) => c.op === "rpc")).toBe(false);
  });
});
