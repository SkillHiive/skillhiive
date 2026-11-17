import { vi } from "vitest";

/**
 * A stand-in for "@/lib/cue" that keeps the real pure helpers and replaces every call
 * that would reach Supabase with a mock the test controls.
 */
export async function mockCueModule() {
  const actual = await vi.importActual<typeof import("@/lib/cue")>("@/lib/cue");
  return {
    ...actual,
    peekCueLink: vi.fn(),
    approveCueLink: vi.fn(),
    fetchMyCueDevices: vi.fn(),
    revokeCueDevice: vi.fn(),
    fetchMyCueProjects: vi.fn(),
    mapCueProject: vi.fn(),
    fetchCodingTimeSource: vi.fn(),
    setCodingTimeSource: vi.fn(),
    fetchCodingTimeComparison: vi.fn(),
    fetchUserCodingExtras: vi.fn(),
  };
}
