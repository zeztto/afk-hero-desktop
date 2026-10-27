import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialGameState, maxStage } from "./game";
import {
  loadGameStateFallback,
  createSaveChecksum,
  parseImportedGameState,
  resetGameState,
  restoreBackupGameState,
  saveGameState,
  serializeGameStateForExport
} from "./save";

describe("save boundary", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
    vi.stubGlobal("window", {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes local saves into valid progression bounds", () => {
    localStorage.setItem(
      "afk-hero-save-v1",
      JSON.stringify({
        ...createInitialGameState(1_000),
        stage: 999,
        highestStage: -10,
        overdrive: 999,
        parts: -40,
        essence: -2,
        levelPoints: -1,
        skills: {
          cleave: 12,
          bulwark: -4,
          treasury: 2.8,
          pressure: 5,
          salvage: 99
        },
        runLog: Array.from({ length: 20 }, (_value, index) => ({
          id: `activity-${index}`,
          kind: index === 0 ? "travel" : "loot",
          title: `Activity ${index}   logged`,
          detail: "A long route event detail ".repeat(8),
          stage: 999,
          at: 2_000 + index
        })),
        autoSellRarities: ["legendary", "common", "common", "uncommon"],
        inventory: Array.from({ length: 40 }, (_value, index) => ({
          id: `item-${index}`,
          slot: "blade",
          rarity: "common",
          level: 1,
          power: 1,
          name: "Common Starforged Blade",
          droppedAtStage: 1,
          locked: index === 0 ? "yes" : index === 1
        }))
      })
    );

    const state = loadGameStateFallback(2_000);

    expect(state.stage).toBe(maxStage);
    expect(state.highestStage).toBe(maxStage);
    expect(state.overdrive).toBe(100);
    expect(state.parts).toBe(0);
    expect(state.essence).toBe(0);
    expect(state.levelPoints).toBe(0);
    expect(state.skills.cleave).toBe(5);
    expect(state.skills.bulwark).toBe(0);
    expect(state.skills.treasury).toBe(2);
    expect(state.skills.salvage).toBe(5);
    expect(state.claimedContracts).toEqual([]);
    expect(state.runLog).toHaveLength(12);
    expect(state.runLog[0]).toMatchObject({ kind: "travel", title: "Activity 0 logged", stage: maxStage });
    expect(state.runLog[0].detail.length).toBeLessThanOrEqual(120);
    expect(state.inventory).toHaveLength(24);
    expect(state.inventory[0].locked).toBe(false);
    expect(state.inventory[1].locked).toBe(true);
    expect(state.autoSellRarities).toEqual(["common", "uncommon"]);
  });

  it("normalizes malformed legacy runtime fields instead of poisoning the game state", () => {
    localStorage.setItem(
      "afk-hero-save-v1",
      JSON.stringify({
        ...createInitialGameState(1_000),
        heroName: "   ",
        level: "25",
        xp: "rich",
        gold: "infinite",
        relics: -10,
        kills: Number.NaN,
        heroHp: "full",
        enemyHp: -50,
        enemySeed: "seed",
        gear: {
          blade: "high",
          armor: -1,
          banner: 2.8,
          goggles: 999999,
          engine: null
        },
        inventory: [
          {
            id: "valid-blade",
            slot: "blade",
            rarity: "rare",
            level: "bad",
            power: 44.9,
            name: "  Riveted   Edge  ",
            droppedAtStage: 999,
            locked: true
          },
          {
            id: "bad-slot",
            slot: "ring",
            rarity: "rare",
            level: 1,
            power: 1,
            name: "Bad",
            droppedAtStage: 1
          }
        ],
        equipped: {
          blade: "valid-blade",
          armor: "missing"
        },
        lastOfflineReward: {
          seconds: "old",
          gold: -10,
          xp: 22.9,
          parts: 1,
          essence: 1,
          stages: 1,
          capped: true
        }
      })
    );

    const state = loadGameStateFallback(2_000);

    expect(state.heroName).toBe("Ari");
    expect(state.level).toBe(1);
    expect(state.xp).toBe(0);
    expect(state.gold).toBe(0);
    expect(state.relics).toBe(0);
    expect(state.kills).toBe(0);
    expect(state.heroHp).toBeGreaterThan(0);
    expect(state.enemyHp).toBeGreaterThan(0);
    expect(state.enemySeed).toBe(0);
    expect(state.gear.blade).toBe(1);
    expect(state.gear.armor).toBe(1);
    expect(state.gear.banner).toBe(2);
    expect(state.gear.goggles).toBe(9999);
    expect(state.gear.engine).toBe(1);
    expect(state.inventory).toHaveLength(1);
    expect(state.inventory[0]).toMatchObject({
      id: "valid-blade",
      slot: "blade",
      rarity: "rare",
      level: 1,
      power: 44,
      name: "Riveted Edge",
      droppedAtStage: maxStage,
      locked: true
    });
    expect(state.equipped.blade).toBe("valid-blade");
    expect(state.equipped.armor).toBeNull();
    expect(state.lastOfflineReward).toMatchObject({
      seconds: 0,
      gold: 0,
      xp: 22,
      capped: true
    });
  });

  it("normalizes campaign cleared state for legacy endgame saves", () => {
    localStorage.setItem(
      "afk-hero-save-v1",
      JSON.stringify({
        ...createInitialGameState(1_000),
        stage: maxStage,
        highestStage: maxStage,
        bossesDefeated: 12,
        campaignCleared: undefined
      })
    );

    const state = loadGameStateFallback(2_000);

    expect(state.campaignCleared).toBe(true);
  });

  it("reports native save write failures", async () => {
    window.afkHeroStore = {
      load: vi.fn(),
      write: vi.fn().mockResolvedValue({ ok: false }),
      reset: vi.fn()
    };

    await expect(saveGameState(createInitialGameState(1_000))).rejects.toThrow("Native save write failed");
  });

  it("reports native save reset failures", async () => {
    window.afkHeroStore = {
      load: vi.fn(),
      write: vi.fn(),
      reset: vi.fn().mockResolvedValue({ ok: false })
    };

    await expect(resetGameState(1_000)).rejects.toThrow("Native save reset failed");
  });

  it("restores a native backup save through the guarded bridge", async () => {
    window.afkHeroStore = {
      load: vi.fn(),
      write: vi.fn().mockResolvedValue({ ok: true }),
      restoreBackup: vi.fn().mockResolvedValue({
        ok: true,
        state: { ...createInitialGameState(1_000), stage: 22, highestStage: 22, lastSavedAt: 1_000 }
      }),
      reset: vi.fn()
    };

    const restored = await restoreBackupGameState(2_000);

    expect(restored.stage).toBe(22);
    expect(restored.highestStage).toBe(22);
    expect(window.afkHeroStore.restoreBackup).toHaveBeenCalledOnce();
    expect(window.afkHeroStore.write).toHaveBeenCalledOnce();
  });

  it("reports native backup restore failures", async () => {
    window.afkHeroStore = {
      load: vi.fn(),
      write: vi.fn(),
      restoreBackup: vi.fn().mockResolvedValue({ ok: false }),
      reset: vi.fn()
    };

    await expect(restoreBackupGameState(2_000)).rejects.toThrow("Native save backup restore failed");
  });

  it("exports and imports normalized save files", () => {
    const source = {
      ...createInitialGameState(1_000),
      stage: 42,
      highestStage: 42,
      gold: 1234,
      claimedContracts: ["stage-10"]
    };
    const exported = serializeGameStateForExport(source, 2_000);
    const envelope = JSON.parse(exported);
    const imported = parseImportedGameState(exported, 2_000);

    expect(envelope.kind).toBe("afk-hero-save-export");
    expect(envelope.checksum).toBe(createSaveChecksum(envelope.state));
    expect(imported.stage).toBe(42);
    expect(imported.highestStage).toBe(42);
    expect(imported.gold).toBe(1234);
    expect(imported.claimedContracts).toEqual(["stage-10"]);
    expect(imported.lastSavedAt).toBe(2_000);
  });

  it("rejects unsupported imported save versions", () => {
    expect(() => parseImportedGameState(JSON.stringify({ version: 999 }), 2_000)).toThrow("Unsupported save version");
  });

  it("rejects unsafe or oversized imported save files", () => {
    expect(() => parseImportedGameState('{"version":1,"__proto__":{"polluted":true}}', 2_000)).toThrow("Unsafe key");
    expect(() => parseImportedGameState(" ".repeat(512 * 1024 + 1), 2_000)).toThrow("Save import is too large");
  });

  it("rejects tampered export envelopes", () => {
    const exported = serializeGameStateForExport(createInitialGameState(1_000), 2_000);
    const envelope = JSON.parse(exported);
    envelope.state.gold = 999999;

    expect(() => parseImportedGameState(JSON.stringify(envelope), 2_000)).toThrow("Save checksum mismatch");
  });

  it("keeps legacy raw save imports compatible", () => {
    const legacy = {
      ...createInitialGameState(1_000),
      stage: 12,
      highestStage: 12,
      gold: 777
    };

    const imported = parseImportedGameState(JSON.stringify(legacy), 2_000);

    expect(imported.stage).toBe(12);
    expect(imported.highestStage).toBe(12);
    expect(imported.gold).toBe(777);
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
