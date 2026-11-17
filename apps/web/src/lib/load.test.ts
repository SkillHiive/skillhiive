import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadErrorMessage, TimeoutError, withTimeout } from "./load";

describe("withTimeout", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("passes a fast result through", async () => {
    await expect(withTimeout(Promise.resolve(7), 1000)).resolves.toBe(7);
  });

  it("rejects with a TimeoutError when the work takes too long", async () => {
    const never = new Promise<number>(() => {});
    const result = withTimeout(never, 1000);
    vi.advanceTimersByTime(1000);
    await expect(result).rejects.toBeInstanceOf(TimeoutError);
  });

  it("accepts thenables such as Supabase queries", async () => {
    const thenable = { then: (resolve: (v: string) => void) => resolve("rows") };
    await expect(withTimeout(thenable as PromiseLike<string>, 1000)).resolves.toBe("rows");
  });
});

describe("loadErrorMessage", () => {
  it("explains time-outs, being offline, and anything else", () => {
    expect(loadErrorMessage(new TimeoutError(10), "your rooms")).toMatch(/taking too long/);
    expect(loadErrorMessage(new TypeError("Failed to fetch"), "posts")).toMatch(/Check your connection/);
    expect(loadErrorMessage({ message: "permission denied" }, "posts")).toBe(
      "Couldn't load posts. Try again in a moment.",
    );
  });
});
