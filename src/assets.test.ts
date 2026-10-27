import { describe, expect, it } from "vitest";
import { bossSpriteSources, enemySpriteSources } from "./App";

describe("battle sprite pools", () => {
  it("loads six normal enemy families", () => {
    expect(enemySpriteSources).toHaveLength(6);
    expect(new Set(enemySpriteSources).size).toBe(6);
  });

  it("loads one boss sprite per region in progression order", () => {
    expect(bossSpriteSources).toHaveLength(6);
    expect(new Set(bossSpriteSources).size).toBe(6);
    expect(bossSpriteSources.join("\n")).toContain("boss-harbor-gearlord");
    expect(bossSpriteSources.join("\n")).toContain("boss-cathedral-furnace");
    expect(bossSpriteSources.join("\n")).toContain("boss-clocktower-warden");
  });
});
