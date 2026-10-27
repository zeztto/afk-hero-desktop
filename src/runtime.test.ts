import { describe, expect, it } from "vitest";
import { getRuntimeCadence } from "./runtime";

describe("runtime cadence", () => {
  it("uses full cadence while the game is focused and visible", () => {
    expect(getRuntimeCadence("game", false, true)).toEqual({
      tickMs: 250,
      renderMs: 0,
      renderEnabled: true
    });
  });

  it("reduces focused visible cadence when low power mode is enabled", () => {
    expect(getRuntimeCadence("game", false, true, true)).toEqual({
      tickMs: 500,
      renderMs: 250,
      renderEnabled: true
    });
  });

  it("reduces render and simulation cadence when visible but unfocused", () => {
    expect(getRuntimeCadence("game", false, false)).toEqual({
      tickMs: 500,
      renderMs: 100,
      renderEnabled: true
    });
  });

  it("keeps simulation alive but disables rendering when hidden", () => {
    expect(getRuntimeCadence("game", true, false)).toEqual({
      tickMs: 1000,
      renderMs: 1000,
      renderEnabled: false
    });
  });

  it("disables battle rendering outside the game screen", () => {
    expect(getRuntimeCadence("settings", false, true)).toEqual({
      tickMs: 500,
      renderMs: 500,
      renderEnabled: false
    });
  });
});
