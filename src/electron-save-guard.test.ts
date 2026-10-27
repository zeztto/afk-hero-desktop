import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createInitialGameState } from "./game";

const require = createRequire(import.meta.url);
const { maxSavePayloadBytes, normalizeSavePayloadForDisk, shouldReplaceBackupSnapshot } = require(
  path.join(process.cwd(), "electron", "save-guard.cjs")
) as {
  maxSavePayloadBytes: number;
  normalizeSavePayloadForDisk: (payload: unknown) => string;
  shouldReplaceBackupSnapshot: (primary: unknown, backup: unknown) => boolean;
};

describe("Electron save payload guard", () => {
  it("serializes valid game saves for disk writes", () => {
    const serialized = normalizeSavePayloadForDisk({
      ...createInitialGameState(1_000),
      battlePlan: "hold",
      autoSellRarities: ["common", "uncommon"]
    });
    const parsed = JSON.parse(serialized);

    expect(parsed.version).toBe(1);
    expect(parsed.heroName).toBe("Ari");
    expect(parsed.battlePlan).toBe("hold");
    expect(parsed.autoSellRarities).toEqual(["common", "uncommon"]);
    expect(Buffer.byteLength(serialized, "utf8")).toBeLessThan(maxSavePayloadBytes);
  });

  it("rejects malformed save payloads before disk writes", () => {
    expect(() => normalizeSavePayloadForDisk(null)).toThrow("Save payload must be an object");
    expect(() => normalizeSavePayloadForDisk({ ...createInitialGameState(1_000), version: 999 })).toThrow(
      "Unsupported save payload version"
    );
    expect(() => normalizeSavePayloadForDisk({ ...createInitialGameState(1_000), gold: Number.NaN })).toThrow(
      "Non-finite number"
    );
    expect(() => normalizeSavePayloadForDisk({ ...createInitialGameState(1_000), battlePlan: "rush" })).toThrow(
      "Invalid battle plan"
    );
    expect(() =>
      normalizeSavePayloadForDisk({
        ...createInitialGameState(1_000),
        skills: { ...createInitialGameState(1_000).skills, cleave: 6 }
      })
    ).toThrow("Invalid skills.cleave");
    expect(() => normalizeSavePayloadForDisk({ ...createInitialGameState(1_000), campaignCleared: "yes" })).toThrow(
      "Invalid campaign cleared state"
    );
    expect(() =>
      normalizeSavePayloadForDisk({
        ...createInitialGameState(1_000),
        runLog: [{ id: "bad", kind: "unknown", title: "Bad", detail: "Bad", stage: 1, at: 1_000 }]
      })
    ).toThrow("Invalid run log kind");
    expect(() =>
      normalizeSavePayloadForDisk({
        ...createInitialGameState(1_000),
        inventory: [
          {
            id: "bad-lock",
            slot: "blade",
            rarity: "common",
            level: 1,
            power: 1,
            name: "Bad Lock",
            droppedAtStage: 1,
            locked: "yes"
          }
        ]
      })
    ).toThrow("Invalid equipment locked state");
    expect(() =>
      normalizeSavePayloadForDisk({
        ...createInitialGameState(1_000),
        autoSellRarities: ["rare"]
      })
    ).toThrow("Invalid auto-sell rarities");
  });

  it("rejects unsafe keys and oversized payloads", () => {
    const unsafe = JSON.parse(JSON.stringify(createInitialGameState(1_000)));
    unsafe.inventory = [JSON.parse('{"id":"bad","slot":"blade","rarity":"common","level":1,"power":1,"name":"Bad","droppedAtStage":1,"__proto__":{"polluted":true}}')];

    expect(() => normalizeSavePayloadForDisk(unsafe)).toThrow("Unsafe key");
    expect(() =>
      normalizeSavePayloadForDisk({
        ...createInitialGameState(1_000),
        heroName: "A".repeat(maxSavePayloadBytes)
      })
    ).toThrow("Invalid hero name");
  });

  it("does not downgrade an existing higher-progress backup", () => {
    const primary = { ...createInitialGameState(1_000), stage: 5, highestStage: 5 };
    const backup = { ...createInitialGameState(1_000), stage: 22, highestStage: 22 };
    const improvedPrimary = { ...createInitialGameState(1_000), stage: 30, highestStage: 30 };

    expect(shouldReplaceBackupSnapshot(primary, backup)).toBe(false);
    expect(shouldReplaceBackupSnapshot(improvedPrimary, backup)).toBe(true);
    expect(shouldReplaceBackupSnapshot(primary, null)).toBe(true);
  });
});
