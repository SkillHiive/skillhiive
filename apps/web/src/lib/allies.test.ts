import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({ supabase: {} }));

import { allyIdsFrom, allyStatusFrom } from "./allies";

describe("allyIdsFrom", () => {
  it("returns the other side of each row once, never yourself", () => {
    const rows = [
      { requester_id: "me", receiver_id: "a" },
      { requester_id: "b", receiver_id: "me" },
      { requester_id: "a", receiver_id: "me" },
      { requester_id: "me", receiver_id: "me" },
    ];
    expect(allyIdsFrom(rows, "me").sort()).toEqual(["a", "b"]);
  });
});

describe("allyStatusFrom", () => {
  it("tells who asked whom", () => {
    expect(allyStatusFrom(null, "me")).toBe("none");
    expect(allyStatusFrom({ requester_id: "me", receiver_id: "x", status: "pending" }, "me")).toBe("pending_sent");
    expect(allyStatusFrom({ requester_id: "x", receiver_id: "me", status: "pending" }, "me")).toBe("pending_received");
    expect(allyStatusFrom({ requester_id: "x", receiver_id: "me", status: "accepted" }, "me")).toBe("accepted");
    expect(allyStatusFrom({ requester_id: "x", receiver_id: "me", status: "declined" }, "me")).toBe("none");
  });
});
