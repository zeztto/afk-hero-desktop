import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isDisplayMode,
  loadAudioSettings,
  loadDisplayMode,
  loadRuntimeSettings,
  loadWindowSettings,
  normalizeAudioSettings,
  normalizeRuntimeSettings,
  normalizeWindowSettings,
  saveAudioSettings,
  saveDisplayMode,
  saveRuntimeSettings,
  saveWindowSettings
} from "./settings";

describe("display settings", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads windowed mode by default", () => {
    expect(loadDisplayMode()).toBe("windowed");
  });

  it("persists valid display mode choices", () => {
    expect(saveDisplayMode("borderless")).toEqual({ ok: true });
    expect(loadDisplayMode()).toBe("borderless");
  });

  it("ignores invalid stored display mode values", () => {
    localStorage.setItem("afk-hero-display-mode-v1", "floating");

    expect(loadDisplayMode()).toBe("windowed");
    expect(isDisplayMode("fullscreen")).toBe(true);
    expect(isDisplayMode("floating")).toBe(false);
  });

  it("loads and persists normalized audio settings", () => {
    expect(loadAudioSettings()).toEqual({ enabled: true, volume: 0.42 });
    expect(saveAudioSettings({ enabled: false, volume: 0.8 })).toEqual({ ok: true });
    expect(loadAudioSettings()).toEqual({ enabled: false, volume: 0.8 });
  });

  it("clamps invalid audio settings", () => {
    expect(normalizeAudioSettings({ enabled: true, volume: 2 })).toEqual({ enabled: true, volume: 1 });
    expect(normalizeAudioSettings({ enabled: false, volume: -1 })).toEqual({ enabled: false, volume: 0 });
    expect(normalizeAudioSettings({ enabled: "yes", volume: Number.NaN })).toEqual({ enabled: true, volume: 0.42 });
  });

  it("loads and persists normalized runtime settings", () => {
    expect(loadRuntimeSettings()).toEqual({ lowPower: false, battleSpeed: 1 });
    expect(saveRuntimeSettings({ lowPower: true, battleSpeed: 2 })).toEqual({ ok: true });
    expect(loadRuntimeSettings()).toEqual({ lowPower: true, battleSpeed: 2 });
    expect(normalizeRuntimeSettings({ lowPower: "yes", battleSpeed: 3 })).toEqual({ lowPower: false, battleSpeed: 1 });
    expect(normalizeRuntimeSettings({ lowPower: false, battleSpeed: 2 })).toEqual({ lowPower: false, battleSpeed: 2 });
  });

  it("loads and persists normalized window settings", () => {
    expect(loadWindowSettings()).toEqual({ alwaysOnTop: false, compactMode: false });
    expect(saveWindowSettings({ alwaysOnTop: true, compactMode: true })).toEqual({ ok: true });
    expect(loadWindowSettings()).toEqual({ alwaysOnTop: true, compactMode: true });
    expect(normalizeWindowSettings({ alwaysOnTop: "yes", compactMode: "yes" })).toEqual({
      alwaysOnTop: false,
      compactMode: false
    });
  });
});

function createMemoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => Array.from(entries.keys())[index] ?? null,
    removeItem: (key) => entries.delete(key),
    setItem: (key, value) => {
      entries.set(key, value);
    }
  };
}
