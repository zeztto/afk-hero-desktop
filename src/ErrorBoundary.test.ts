import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary, getErrorMessage } from "./ErrorBoundary";

describe("error boundary helpers", () => {
  it("uses explicit error messages", () => {
    expect(getErrorMessage(new Error("renderer exploded"))).toBe("renderer exploded");
  });

  it("falls back for unknown thrown values", () => {
    expect(getErrorMessage("broken")).toBe("Unexpected renderer failure");
    expect(getErrorMessage(new Error("   "))).toBe("Unexpected renderer failure");
  });
});


it("Start Fresh preserves unrelated browser storage", async () => {
  const entries = new Map([["other-app-progress", "keep"], ["afk-hero-save-v1", "remove"], ["afk-hero-audio-settings-v1", "remove"]]);
  vi.stubGlobal("localStorage", { get length() { return entries.size; }, key: (index: number) => [...entries.keys()][index] ?? null, removeItem: (key: string) => entries.delete(key), clear: () => entries.clear() });
  vi.stubGlobal("window", { afkHeroStore: { reset: async () => ({ok:true}) }, location: { reload: vi.fn() } });
  try {
    const boundary = new ErrorBoundary({});
    await (boundary as unknown as { resetAndReload: () => Promise<void> }).resetAndReload();
    expect(entries.get("other-app-progress")).toBe("keep");
    expect(entries.has("afk-hero-save-v1")).toBe(false);
  } finally { vi.unstubAllGlobals(); }
});
