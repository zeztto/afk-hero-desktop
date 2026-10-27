import { describe, expect, it } from "vitest";
import { createInitialGameState } from "./game";
import { serializeDiagnosticsReport } from "./diagnostics";

describe("diagnostics report", () => {
  it("exports build, settings, progression, and support-safe summary fields", () => {
    const state = {
      ...createInitialGameState(1_000),
      stage: 120,
      highestStage: 120,
      campaignCleared: true,
      gold: 12345,
      parts: 67
    };
    const report = JSON.parse(
      serializeDiagnosticsReport(
        state,
        {
          displayMode: "windowed",
          audioSettings: { enabled: false, volume: 0.25 },
          runtimeSettings: { lowPower: true, battleSpeed: 2 },
          windowSettings: { alwaysOnTop: true, compactMode: true }
        },
        2_000,
        { userAgent: "vitest", platform: "darwin" }
      )
    );

    expect(report.kind).toBe("afk-hero-diagnostics");
    expect(report.build.productName).toBe("AFK HERO");
    expect(report.settings.displayMode).toBe("windowed");
    expect(report.settings.runtimeSettings.lowPower).toBe(true);
    expect(report.settings.runtimeSettings.battleSpeed).toBe(2);
    expect(report.settings.windowSettings.alwaysOnTop).toBe(true);
    expect(report.settings.windowSettings.compactMode).toBe(true);
    expect(report.progression.stage).toBe(120);
    expect(report.progression.campaignCleared).toBe(true);
    expect(report.economy.gold).toBe(12345);
    expect(report.combat.powerScore).toBeGreaterThan(0);
    expect(report.inventory.stored).toBe(0);
    expect(report.runtime.platform).toBe("darwin");
  });
});
