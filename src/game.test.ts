import { describe, expect, it } from "vitest";
import {
  ascend,
  acknowledgeBossStory,
  applyRecommendedRunAction,
  applyOfflineProgress,
  buyGear,
  buySkill,
  claimAllContracts,
  claimContract,
  craftEquipmentItem,
  deriveAchievements,
  deriveBattleForecast,
  deriveBestiary,
  deriveChallengeTrials,
  deriveCombatFeedback,
  createInitialGameState,
  deriveContracts,
  deriveCraftingPreview,
  deriveForgeAllPreview,
  deriveLatestDrop,
  deriveRewardPreview,
  deriveReforgePreview,
  deriveRunReport,
  deriveSkillRefund,
  deriveStats,
  deriveStoryArchive,
  deriveUpgradePreview,
  equipBestItems,
  equipItem,
  forgeAffordableGear,
  getGearCost,
  getGearPartCost,
  getSkillCost,
  getSkillEssenceCost,
  maxSkillRank,
  maxStage,
  respecSkills,
  retryCurrentStage,
  sellItem,
  sellUnequippedByRarity,
  setBattlePlan,
  tick,
  travelToStage,
  toggleAutoSellRarity,
  toggleEquipmentLock,
  type GameState,
  type GearKey,
  type SkillKey
} from "./game";

const gearOrder: GearKey[] = ["blade", "armor", "engine", "banner", "goggles"];
const skillOrder: SkillKey[] = ["cleave", "bulwark", "pressure", "treasury", "salvage"];

describe("game simulation", () => {
  it("creates a playable initial state", () => {
    const state = createInitialGameState(1_000);
    const stats = deriveStats(state);

    expect(state.stage).toBe(1);
    expect(state.level).toBe(1);
    expect(state.highestStage).toBe(1);
    expect(state.overdrive).toBe(0);
    expect(state.parts).toBe(0);
    expect(state.essence).toBe(0);
    expect(state.levelPoints).toBe(0);
    expect(state.introSeen).toBe(false);
    expect(state.seenBossStories).toEqual([]);
    expect(state.campaignCleared).toBe(false);
    expect(state.runLog).toEqual([]);
    expect(state.inventory).toEqual([]);
    expect(state.equipped.blade).toBeNull();
    expect(state.autoSellRarities).toEqual([]);
    expect(state.heroHp).toBe(stats.maxHp);
    expect(state.enemyHp).toBe(stats.enemyMaxHp);
    expect(stats.stageCap).toBe(maxStage);
  });

  it("advances combat and rewards kills over time", () => {
    let state = createInitialGameState(1_000);

    for (let index = 0; index < 80; index += 1) {
      state = tick(state, 250, 1_000 + index * 250);
    }

    expect(state.kills).toBeGreaterThan(0);
    expect(state.gold).toBeGreaterThan(0);
  });

  it("spends gold on gear upgrades", () => {
    const state = createInitialGameState(1_000);
    const cost = getGearCost(state, "blade");
    const upgraded = buyGear({ ...state, gold: cost, parts: getGearPartCost(state, "blade") }, "blade");

    expect(upgraded.gold).toBe(0);
    expect(upgraded.gear.blade).toBe(2);
    expect(deriveStats(upgraded).damage).toBeGreaterThan(deriveStats(state).damage);
  });

  it("previews upgrade stat gains before purchase", () => {
    const state = createInitialGameState(1_000);
    const gearPreview = deriveUpgradePreview(state, "gear", "blade");
    const skillPreview = deriveUpgradePreview(state, "skill", "pressure");

    expect(gearPreview.powerGain).toBeGreaterThan(0);
    expect(gearPreview.effectLabel).toMatch(/^Damage \+\d+/);
    expect(skillPreview.powerGain).toBeGreaterThan(0);
    expect(skillPreview.effectLabel).toMatch(/^Burst \+\d+/);
  });

  it("spends exactly the displayed part cost on gear upgrades", () => {
    const state = createInitialGameState(1_000);
    const key: GearKey = "engine";
    const cost = getGearCost(state, key);
    const partCost = getGearPartCost(state, key);
    const upgraded = buyGear({ ...state, gold: cost, parts: partCost + 5 }, key);

    expect(partCost).toBeGreaterThan(0);
    expect(upgraded.gold).toBe(0);
    expect(upgraded.parts).toBe(5);
    expect(upgraded.gear[key]).toBe(state.gear[key] + 1);
  });

  it("forges all affordable gear upgrades through a balanced workshop queue", () => {
    const state = {
      ...createInitialGameState(1_000),
      gold: 420,
      parts: 18,
      gear: {
        blade: 1,
        armor: 1,
        banner: 1,
        goggles: 1,
        engine: 1
      }
    };
    const preview = deriveForgeAllPreview(state);
    const forged = forgeAffordableGear(state);

    expect(preview.available).toBe(true);
    expect(preview.totalUpgrades).toBeGreaterThan(1);
    expect(forged.gold).toBe(state.gold - preview.goldCost);
    expect(forged.parts).toBe(state.parts - preview.partsCost);
    expect(forged.gear).toEqual(preview.targetLevels);
    expect(Math.max(...Object.values(forged.gear)) - Math.min(...Object.values(forged.gear))).toBeLessThanOrEqual(1);
    expect(deriveStats(forged).powerScore).toBeGreaterThan(deriveStats(state).powerScore);
  });

  it("keeps forge all as a no-op when no gear upgrade is affordable", () => {
    const state = { ...createInitialGameState(1_000), gold: 0, parts: 0 };
    const preview = deriveForgeAllPreview(state);

    expect(preview.available).toBe(false);
    expect(preview.totalUpgrades).toBe(0);
    expect(forgeAffordableGear(state)).toBe(state);
  });

  it("crafts a focused gear drop from parts and essence", () => {
    const state = {
      ...createInitialGameState(1_000),
      level: 12,
      highestStage: 32,
      stage: 32,
      parts: 120,
      essence: 3,
      inventory: [
        { id: "strong-blade", slot: "blade" as const, rarity: "rare" as const, level: 22, power: 180, name: "Strong Blade", droppedAtStage: 22 }
      ],
      equipped: {
        blade: "strong-blade",
        armor: null,
        banner: null,
        goggles: null,
        engine: null
      }
    };
    const preview = deriveCraftingPreview(state);
    const crafted = craftEquipmentItem(state);

    expect(preview.available).toBe(true);
    expect(preview.slot).not.toBe("blade");
    expect(preview.rarity).toBe("rare");
    expect(crafted.parts).toBe(state.parts - preview.partsCost);
    expect(crafted.essence).toBe(state.essence - preview.essenceCost);
    const craftedItem = crafted.inventory.find((item) => item.name === preview.itemName);
    expect(craftedItem).toMatchObject({
      slot: preview.slot,
      rarity: preview.rarity,
      power: preview.itemPower,
      name: preview.itemName
    });
    expect(crafted.runLog[0]).toMatchObject({ kind: "loot", title: "Gear crafted" });
  });

  it("spends relics on skill upgrades", () => {
    const state = createInitialGameState(1_000);
    const upgraded = buySkill({ ...state, relics: 3, essence: getSkillEssenceCost(state, "treasury"), levelPoints: 1 }, "treasury");

    expect(upgraded.relics).toBe(0);
    expect(upgraded.levelPoints).toBe(0);
    expect(upgraded.skills.treasury).toBe(1);
    expect(deriveStats(upgraded).goldBonus).toBeGreaterThan(deriveStats(state).goldBonus);
  });

  it("requires a talent point for skill upgrades", () => {
    const state = createInitialGameState(1_000);
    const candidate = { ...state, relics: 10, essence: 10, levelPoints: 0 };
    const unchanged = buySkill(candidate, "cleave");

    expect(unchanged).toBe(candidate);
  });

  it("respecs skills and refunds invested resources", () => {
    const state = {
      ...createInitialGameState(1_000),
      relics: 30,
      essence: 10,
      levelPoints: 3
    };
    const skilled = buySkill(buySkill(buySkill(state, "cleave"), "treasury"), "pressure");
    const refund = deriveSkillRefund(skilled);
    const respecced = respecSkills(skilled);

    expect(refund.levelPoints).toBe(3);
    expect(respecced.skills.cleave).toBe(0);
    expect(respecced.skills.treasury).toBe(0);
    expect(respecced.skills.pressure).toBe(0);
    expect(respecced.relics).toBe(state.relics);
    expect(respecced.essence).toBe(state.essence);
    expect(respecced.levelPoints).toBe(state.levelPoints);
    expect(respecSkills(respecced)).toBe(respecced);
  });

  it("previews reforge relic gains and retained build value", () => {
    const state = {
      ...createInitialGameState(1_000),
      stage: 44,
      highestStage: 60,
      level: 12,
      parts: 101,
      relics: 5,
      skills: {
        cleave: 2,
        bulwark: 1,
        treasury: 0,
        pressure: 1,
        salvage: 0
      },
      inventory: Array.from({ length: 24 }, (_value, index) => ({
        id: `preview-item-${index}`,
        slot: "blade" as const,
        rarity: "common" as const,
        level: 1,
        power: 1,
        name: "Preview Blade",
        droppedAtStage: 1
      }))
    };

    const preview = deriveReforgePreview(state);
    const reforged = ascend(state);

    expect(preview.available).toBe(true);
    expect(preview.earnedRelics).toBe(9);
    expect(preview.retainedParts).toBe(25);
    expect(preview.retainedSkillRanks).toBe(4);
    expect(preview.retainedEquipment).toBe(20);
    expect(preview.nextRelicDamageBonusPercent).toBe(56);
    expect(reforged.relics).toBe(state.relics + preview.earnedRelics);
    expect(reforged.parts).toBe(preview.retainedParts);
    expect(reforged.inventory).toHaveLength(preview.retainedEquipment);
    expect(reforged.runLog[0]).toMatchObject({
      kind: "reforge",
      title: "Route reforged",
      stage: 44
    });
  });

  it("caps skill upgrades at five ranks", () => {
    const state = {
      ...createInitialGameState(1_000),
      relics: 999,
      essence: 999,
      levelPoints: 999,
      skills: {
        ...createInitialGameState(1_000).skills,
        cleave: maxSkillRank
      }
    };

    const capped = buySkill(state, "cleave");
    const preview = deriveUpgradePreview(state, "skill", "cleave");

    expect(capped).toBe(state);
    expect(preview.powerGain).toBe(0);
    expect(preview.effectLabel).toBe("Max rank");
  });

  it("uses expanded stage regions and boss pacing", () => {
    const state = createInitialGameState(1_000);
    const regionTwo = deriveStats({ ...state, stage: 25, highestStage: 25 });
    const boss = deriveStats({ ...state, stage: 30, highestStage: 30 });

    expect(regionTwo.regionName).toBe("Boiler Docks");
    expect(regionTwo.nextBossStage).toBe(30);
    expect(boss.stageBoss).toBe(true);
    expect(boss.enemyMaxHp).toBeGreaterThan(regionTwo.enemyMaxHp);
  });

  it("derives combat profiles for normal enemies and boss mechanics", () => {
    const state = createInitialGameState(1_000);
    const armored = deriveStats({ ...state, stage: 1, highestStage: 1, enemySeed: 0 });
    const aerial = deriveStats({ ...state, stage: 1, highestStage: 1, enemySeed: 1 });
    const boss = deriveStats({ ...state, stage: 10, highestStage: 10 });

    expect(armored.enemyTraitLabel).toBe("Armored");
    expect(aerial.enemyTraitLabel).toBe("Aerial");
    expect(armored.enemyMaxHp).toBeGreaterThan(aerial.enemyMaxHp);
    expect(aerial.enemyDamage).toBeGreaterThan(armored.enemyDamage);
    expect(boss.stageBoss).toBe(true);
    expect(boss.enemyTraitLabel).toBe("Pressure Crown");
    expect(boss.rewardMultiplier).toBeGreaterThan(armored.rewardMultiplier);
    expect(boss.overdriveChargeMultiplier).toBeLessThan(armored.overdriveChargeMultiplier);
  });

  it("derives a region bestiary for unlocked enemy and boss intel", () => {
    const bestiary = deriveBestiary({ ...createInitialGameState(1_000), highestStage: 25 });

    expect(bestiary).toHaveLength(6);
    expect(bestiary[0].unlocked).toBe(true);
    expect(bestiary[1].unlocked).toBe(true);
    expect(bestiary[2].unlocked).toBe(false);
    expect(bestiary[0].enemyNames).toHaveLength(6);
    expect(bestiary[0].enemyTraits).toEqual(["Scrapper", "Armored", "Aerial", "Zealot", "Duelist", "Volatile"]);
    expect(bestiary[0].bossName).toBe("Boiler Regent");
    expect(bestiary[0].bossMechanic).toBe("Pressure Crown");
  });

  it("charges and spends overdrive as a burst mechanic", () => {
    const base = createInitialGameState(1_000);
    const state = {
      ...base,
      overdrive: 100,
      enemyHp: deriveStats(base).enemyMaxHp
    };
    const progressed = tick(state, 250, 1_250);

    expect(progressed.overdrive).toBeLessThan(100);
    expect(progressed.kills).toBeGreaterThanOrEqual(state.kills);
    expect(progressed.gold).toBeGreaterThanOrEqual(state.gold);
  });

  it("derives transparent battle forecast rates", () => {
    const state = createInitialGameState(1_000);
    const forecast = deriveBattleForecast(state);

    expect(forecast.clearSeconds).toBeGreaterThan(0);
    expect(forecast.goldPerMinute).toBeGreaterThan(0);
    expect(forecast.xpPerMinute).toBeGreaterThan(0);
    expect(forecast.offlineCapHours).toBe(8);
    expect(Number.isFinite(forecast.stageRequirement)).toBe(true);
  });

  it("derives visible combat feedback numbers", () => {
    const feedback = deriveCombatFeedback({
      ...createInitialGameState(1_000),
      stage: 30,
      highestStage: 30,
      skills: {
        cleave: 2,
        bulwark: 1,
        treasury: 0,
        pressure: 2,
        salvage: 0
      }
    });

    expect(feedback.hitDamage).toBeGreaterThan(0);
    expect(feedback.critDamage).toBeGreaterThan(feedback.hitDamage);
    expect(feedback.burstDamage).toBeGreaterThan(feedback.hitDamage);
    expect(feedback.incomingDamage).toBeGreaterThan(0);
    expect(["Stable", "Guarded", "Danger"]).toContain(feedback.threatLabel);
  });

  it("previews current clear rewards for waves and bosses", () => {
    const wave = deriveRewardPreview({ ...createInitialGameState(1_000), kills: 8 });
    const boss = deriveRewardPreview({ ...createInitialGameState(1_000), stage: 20, highestStage: 20 });

    expect(wave.gold).toBeGreaterThan(0);
    expect(wave.xp).toBeGreaterThan(0);
    expect(wave.parts).toBeGreaterThan(0);
    expect(wave.essence).toBe(0);
    expect(wave.relics).toBe(0);
    expect(wave.dropLabel).toBe("Gear in 2");
    expect(boss.essence).toBeGreaterThan(0);
    expect(boss.relics).toBeGreaterThan(0);
    expect(boss.dropLabel).toBe("Guaranteed gear");
  });

  it("derives a player-facing run report from progression, contracts, and loadout", () => {
    const state = createInitialGameState(1_000);
    const report = deriveRunReport({
      ...state,
      level: 16,
      highestStage: 60,
      bossesDefeated: 6,
      kills: 80,
      totalGold: 2400,
      claimedContracts: ["stage-10", "kills-50"],
      inventory: [
        { id: "blade-1", slot: "blade", rarity: "rare", level: 8, power: 44, name: "Test Blade", droppedAtStage: 30 },
        { id: "armor-1", slot: "armor", rarity: "uncommon", level: 7, power: 28, name: "Test Armor", droppedAtStage: 24 }
      ],
      equipped: {
        ...state.equipped,
        blade: "blade-1",
        armor: "armor-1"
      }
    });

    expect(report.routeProgressPercent).toBe(50);
    expect(report.bossesCleared).toBe(6);
    expect(report.bossesTotal).toBe(12);
    expect(report.readyContracts).toBeGreaterThan(0);
    expect(report.claimedContracts).toBe(2);
    expect(report.equippedSlots).toBe(2);
    expect(report.equipmentPower).toBe(72);
    expect(report.nextMilestoneLabel).toBe("Sealbreaker");
    expect(report.nextActionLabel).toBe("Claim Goals");
    expect(report.nextActionDetail).toContain("Sealbreaker");
    expect(report.nextActionReady).toBe(true);
    expect(report.pressureRank).toBe("Vanguard");
  });

  it("recommends the next spend when no contract is ready to claim", () => {
    const state = createInitialGameState(1_000);
    const report = deriveRunReport({
      ...state,
      gold: getGearCost(state, "blade"),
      parts: getGearPartCost(state, "blade")
    });

    expect(report.nextActionLabel).toBe("Upgrade Starforged Blade");
    expect(report.nextActionDetail).toBe(`${getGearCost(state, "blade")} gold`);
    expect(report.nextActionReady).toBe(true);
  });

  it("applies the recommended ready goal claim from the run report", () => {
    const state = {
      ...createInitialGameState(1_000),
      highestStage: 10,
      stage: 10,
      kills: 55,
      level: 15,
      inventory: Array.from({ length: 8 }, (_value, index) => ({
        id: `recommended-claim-item-${index}`,
        slot: "blade" as const,
        rarity: "common" as const,
        level: 1,
        power: 2,
        name: "Common Contract Blade",
        droppedAtStage: 1
      }))
    };
    const applied = applyRecommendedRunAction(state);

    expect(deriveRunReport(state).nextActionLabel).toBe("Claim Goals");
    expect(applied.claimedContracts).toContain("stage-10");
    expect(applied.gold).toBeGreaterThan(state.gold);
    expect(applied.runLog[0]).toMatchObject({ kind: "contract", title: "Goal claimed" });
  });

  it("applies the recommended ready gear upgrade from the run report", () => {
    const state = createInitialGameState(1_000);
    const candidate = {
      ...state,
      gold: getGearCost(state, "blade"),
      parts: getGearPartCost(state, "blade")
    };
    const applied = applyRecommendedRunAction(candidate);

    expect(deriveRunReport(candidate).nextActionLabel).toBe("Upgrade Starforged Blade");
    expect(applied.gear.blade).toBe(candidate.gear.blade + 1);
    expect(applied.gold).toBe(0);
  });

  it("applies the recommended ready craft action from the run report", () => {
    const state = {
      ...createInitialGameState(1_000),
      highestStage: 32,
      stage: 32,
      parts: 120,
      essence: 3,
      gold: 0,
      claimedContracts: ["stage-10"]
    };
    const report = deriveRunReport(state);
    const applied = applyRecommendedRunAction(state);

    expect(report.nextActionLabel).toBe("Craft Gear");
    expect(report.nextActionDetail).toContain("Crafted Rare");
    expect(applied.inventory.some((item) => item.id.startsWith("crafted-"))).toBe(true);
    expect(applied.parts).toBeLessThan(state.parts);
    expect(applied.essence).toBeLessThan(state.essence);
  });

  it("does not apply the recommended action before resources are ready", () => {
    const state = createInitialGameState(1_000);

    expect(deriveRunReport(state).nextActionReady).toBe(false);
    expect(applyRecommendedRunAction(state)).toBe(state);
  });

  it("derives local achievement badges from progression without save migration", () => {
    const state = {
      ...createInitialGameState(1_000),
      highestStage: 120,
      bossesDefeated: 12,
      campaignCleared: true,
      claimedContracts: ["stage-10", "kills-50", "bosses-3", "level-15", "equipment-8", "stage-60"],
      skills: {
        cleave: 3,
        bulwark: 2,
        treasury: 2,
        pressure: 2,
        salvage: 1
      },
      inventory: [
        { id: "badge-blade", slot: "blade" as const, rarity: "legendary" as const, level: 20, power: 140, name: "Badge Blade", droppedAtStage: 100 },
        { id: "badge-armor", slot: "armor" as const, rarity: "epic" as const, level: 18, power: 120, name: "Badge Armor", droppedAtStage: 90 }
      ],
      equipped: {
        blade: "badge-blade",
        armor: "badge-armor",
        banner: null,
        goggles: null,
        engine: null
      },
      lastOfflineReward: {
        seconds: 360,
        gold: 100,
        xp: 50,
        parts: 8,
        essence: 1,
        stages: 1,
        capped: false
      }
    };

    const achievements = deriveAchievements(state);
    const byId = new Map(achievements.map((achievement) => [achievement.id, achievement]));

    expect(achievements).toHaveLength(8);
    expect(byId.get("first-seal")?.unlocked).toBe(true);
    expect(byId.get("ledger-master")?.unlocked).toBe(true);
    expect(byId.get("gearwright")?.unlocked).toBe(true);
    expect(byId.get("talent-engineer")?.unlocked).toBe(true);
    expect(byId.get("quiet-shift")?.unlocked).toBe(true);
    expect(byId.get("clockwork-legend")?.unlocked).toBe(true);
  });

  it("rewards advanced currencies and boss story cues", () => {
    const base = createInitialGameState(1_000);
    const bossState = {
      ...base,
      stage: 10,
      highestStage: 10,
      enemyHp: 1,
      overdrive: 100
    };
    const progressed = tick(bossState, 250, 1_250);

    expect(progressed.bossesDefeated).toBe(1);
    expect(progressed.essence).toBeGreaterThan(0);
    expect(progressed.parts).toBeGreaterThan(0);
    expect(progressed.pendingBossStory?.title).toContain("Defeated");
    expect(progressed.runLog[0]).toMatchObject({
      kind: "boss",
      title: "Boiler Regent defeated",
      stage: 10
    });
    expect(progressed.runLog.some((entry) => entry.kind === "loot")).toBe(true);

    const acknowledged = acknowledgeBossStory(progressed, progressed.pendingBossStory?.id ?? 0);
    expect(acknowledged.pendingBossStory).toBeUndefined();
    expect(acknowledged.seenBossStories).toContain(1);
  });

  it("creates boss clear story cues for every region boss family", () => {
    const expectedBossNames = [
      "Boiler Regent",
      "Harbor Gearlord",
      "Aether Conductor",
      "Cathedral Furnace",
      "Clocktower Warden",
      "Void Foundry King"
    ];

    expectedBossNames.forEach((bossName, regionIndex) => {
      const stage = 10 + regionIndex * 20;
      const base = createInitialGameState(1_000);
      const bossState = {
        ...base,
        level: 50,
        levelPoints: 49,
        stage,
        highestStage: stage,
        enemyHp: 1,
        overdrive: 100,
        gear: {
          blade: 30,
          armor: 30,
          banner: 12,
          goggles: 12,
          engine: 12
        },
        skills: {
          cleave: 5,
          bulwark: 5,
          treasury: 5,
          pressure: 5,
          salvage: 5
        },
        seenBossStories: Array.from({ length: regionIndex }, (_value, index) => index + 1),
        bossesDefeated: regionIndex
      };
      const progressed = tick(bossState, 250, 1_250 + regionIndex);

      expect(deriveStats(bossState).stageBoss).toBe(true);
      expect(deriveStats(bossState).enemyName).toBe(bossName);
      expect(progressed.pendingBossStory?.title).toBe(`${bossName} Defeated`);
      expect(progressed.pendingBossStory?.body.length).toBeGreaterThan(40);
      expect(progressed.pendingBossStory?.regionName).toBe(deriveStats(bossState).regionName);
    });
  });

  it("derives a story archive from opening and acknowledged boss clears", () => {
    const base = createInitialGameState(1_000);
    const initialArchive = deriveStoryArchive(base);
    const progressed = {
      ...base,
      introSeen: true,
      seenBossStories: [1, 3]
    };
    const archive = deriveStoryArchive(progressed);

    expect(initialArchive).toHaveLength(8);
    expect(initialArchive.filter((entry) => entry.unlocked)).toHaveLength(0);
    expect(archive.filter((entry) => entry.unlocked).map((entry) => entry.title)).toEqual([
      "The Last Warm Engine",
      "Boiler Regent Defeated",
      "Harbor Gearlord Defeated"
    ]);
    expect(archive.find((entry) => entry.id === "boss-5")?.unlocked).toBe(false);
  });

  it("keeps story archive compatible with advanced saves that predate story acknowledgements", () => {
    const archive = deriveStoryArchive({
      ...createInitialGameState(1_000),
      introSeen: true,
      highestStage: 31,
      seenBossStories: []
    });

    expect(archive.find((entry) => entry.id === "boss-1")?.unlocked).toBe(true);
    expect(archive.find((entry) => entry.id === "boss-3")?.unlocked).toBe(true);
    expect(archive.find((entry) => entry.id === "boss-5")?.unlocked).toBe(false);
  });

  it("turns the stage cap boss into a campaign ending instead of repeating the final boss", () => {
    const base = createInitialGameState(1_000);
    const finalBossState: GameState = {
      ...base,
      level: 80,
      levelPoints: 79,
      stage: maxStage,
      highestStage: maxStage,
      enemyHp: 1,
      overdrive: 100,
      bossesDefeated: 11,
      seenBossStories: Array.from({ length: 11 }, (_value, index) => index + 1),
      gear: {
        blade: 48,
        armor: 48,
        banner: 24,
        goggles: 24,
        engine: 24
      },
      skills: {
        cleave: 8,
        bulwark: 8,
        treasury: 8,
        pressure: 8,
        salvage: 8
      }
    };

    const cleared = tick(finalBossState, 250, 1_250);
    expect(cleared.campaignCleared).toBe(true);
    expect(cleared.stage).toBe(maxStage);
    expect(cleared.bossesDefeated).toBe(12);
    expect(cleared.pendingBossStory?.title).toBe("A New City Engine");
    expect(deriveStats(cleared).stageBoss).toBe(false);
    expect(deriveStoryArchive(cleared).find((entry) => entry.id === "campaign-ending")?.unlocked).toBe(true);

    const acknowledged = acknowledgeBossStory(cleared, cleared.pendingBossStory?.id ?? 0);
    const postClear = tick({ ...acknowledged, enemyHp: 1, overdrive: 100 }, 250, 1_500);
    expect(postClear.bossesDefeated).toBe(12);
    expect(postClear.pendingBossStory).toBeUndefined();
    expect(deriveStats(postClear).stageBoss).toBe(false);
  });

  it("drops, equips, and sells generated equipment", () => {
    const base = createInitialGameState(1_000);
    let state = { ...base, enemyHp: 1, overdrive: 100 };

    for (let index = 0; index < 5; index += 1) {
      state = tick({ ...state, enemyHp: 1, overdrive: 100 }, 250, 1_250 + index);
    }

    expect(state.inventory.length).toBeGreaterThan(0);
    const item = state.inventory[0];
    expect(deriveLatestDrop(state)?.id).toBe(item.id);
    const equipped = equipItem(state, item.id);
    expect(equipped.equipped[item.slot]).toBe(item.id);
    expect(deriveStats(equipped).powerScore).toBeGreaterThanOrEqual(deriveStats(state).powerScore);

    const sold = sellItem(equipped, item.id);
    expect(sold.inventory.some((candidate) => candidate.id === item.id)).toBe(false);
    expect(sold.equipped[item.slot]).toBeNull();
    expect(sold.gold).toBeGreaterThan(equipped.gold);
  });

  it("selects the latest visible drop by stage and power", () => {
    const state: GameState = {
      ...createInitialGameState(1_000),
      inventory: [
        { id: "old-strong", slot: "blade", rarity: "rare", level: 20, power: 80, name: "Old Strong", droppedAtStage: 20 },
        { id: "latest-weak", slot: "armor", rarity: "common", level: 23, power: 28, name: "Latest Weak", droppedAtStage: 23 },
        { id: "latest-strong", slot: "engine", rarity: "epic", level: 23, power: 92, name: "Latest Strong", droppedAtStage: 23 }
      ]
    };

    expect(deriveLatestDrop(state)?.id).toBe("latest-strong");
  });

  it("equips the strongest item in each slot at once", () => {
    const base = createInitialGameState(1_000);
    const state: GameState = {
      ...base,
      inventory: [
        {
          id: "weak-blade",
          slot: "blade",
          rarity: "common",
          level: 4,
          power: 8,
          name: "Common Starforged Blade",
          droppedAtStage: 4
        },
        {
          id: "strong-blade",
          slot: "blade",
          rarity: "rare",
          level: 8,
          power: 28,
          name: "Rare Starforged Blade",
          droppedAtStage: 8
        },
        {
          id: "armor-best",
          slot: "armor",
          rarity: "uncommon",
          level: 7,
          power: 20,
          name: "Uncommon Dawnplate Armor",
          droppedAtStage: 7
        }
      ]
    };

    const equipped = equipBestItems(state);

    expect(equipped.equipped.blade).toBe("strong-blade");
    expect(equipped.equipped.armor).toBe("armor-best");
    expect(deriveStats(equipped).powerScore).toBeGreaterThan(deriveStats(state).powerScore);
  });

  it("bulk sells only unequipped items for a selected rarity", () => {
    const base = createInitialGameState(1_000);
    const state: GameState = {
      ...base,
      inventory: [
        {
          id: "equipped-common",
          slot: "blade",
          rarity: "common",
          level: 5,
          power: 9,
          name: "Common Starforged Blade",
          droppedAtStage: 5
        },
        {
          id: "loose-common",
          slot: "armor",
          rarity: "common",
          level: 6,
          power: 12,
          name: "Common Dawnplate Armor",
          droppedAtStage: 6
        },
        {
          id: "locked-common",
          slot: "goggles" as const,
          rarity: "common",
          level: 9,
          power: 18,
          name: "Common Aether Goggles",
          droppedAtStage: 9,
          locked: true
        },
        {
          id: "rare-keep",
          slot: "armor",
          rarity: "rare",
          level: 7,
          power: 24,
          name: "Rare Dawnplate Armor",
          droppedAtStage: 7
        }
      ],
      equipped: {
        ...base.equipped,
        blade: "equipped-common"
      }
    };

    const sold = sellUnequippedByRarity(state, "common");

    expect(sold.inventory.some((item) => item.id === "loose-common")).toBe(false);
    expect(sold.inventory.some((item) => item.id === "equipped-common")).toBe(true);
    expect(sold.inventory.some((item) => item.id === "locked-common")).toBe(true);
    expect(sold.inventory.some((item) => item.id === "rare-keep")).toBe(true);
    expect(sold.equipped.blade).toBe("equipped-common");
    expect(sold.gold).toBeGreaterThan(state.gold);
    expect(sold.parts).toBeGreaterThan(state.parts);
  });

  it("toggles equipment lock and blocks direct sales while locked", () => {
    const state: GameState = {
      ...createInitialGameState(1_000),
      inventory: [
        {
          id: "kept-goggles",
          slot: "goggles" as const,
          rarity: "rare",
          level: 11,
          power: 36,
          name: "Rare Aether Goggles",
          droppedAtStage: 11
        }
      ]
    };

    const locked = toggleEquipmentLock(state, "kept-goggles");
    expect(locked.inventory[0].locked).toBe(true);
    expect(sellItem(locked, "kept-goggles")).toBe(locked);

    const unlocked = toggleEquipmentLock(locked, "kept-goggles");
    expect(unlocked.inventory[0].locked).toBe(false);
    expect(sellItem(unlocked, "kept-goggles").inventory).toHaveLength(0);
  });

  it("auto-sells filtered weak drops into gold and parts", () => {
    const base = {
      ...createInitialGameState(1_000),
      stage: 1,
      highestStage: 1,
      kills: 4,
      enemySeed: 3,
      enemyHp: 1,
      overdrive: 100,
      gold: 0,
      parts: 0,
      autoSellRarities: ["common" as const],
      inventory: [
        {
          id: "kept-goggles",
          slot: "goggles" as const,
          rarity: "rare" as const,
          level: 12,
          power: 200,
          name: "Rare Aether Goggles",
          droppedAtStage: 12
        }
      ]
    };
    const progressed = tick(base, 250, 1_250);

    expect(progressed.kills).toBeGreaterThanOrEqual(5);
    expect(progressed.inventory).toHaveLength(1);
    expect(progressed.inventory[0].id).toBe("kept-goggles");
    expect(progressed.gold).toBeGreaterThan(base.gold);
    expect(progressed.parts).toBeGreaterThan(base.parts);
    expect(progressed.runLog[0]).toMatchObject({
      kind: "loot",
      title: "Common gear auto-sold"
    });
  });

  it("keeps filtered drops that improve the slot", () => {
    const base = {
      ...createInitialGameState(1_000),
      stage: 1,
      highestStage: 1,
      kills: 4,
      enemySeed: 3,
      enemyHp: 1,
      overdrive: 100,
      autoSellRarities: ["common" as const]
    };
    const progressed = tick(base, 250, 1_250);

    expect(progressed.inventory).toHaveLength(1);
    expect(progressed.inventory[0].rarity).toBe("common");
  });

  it("toggles auto-sell filters in rarity order", () => {
    const state = createInitialGameState(1_000);
    const common = toggleAutoSellRarity(state, "common");
    const uncommon = toggleAutoSellRarity(common, "uncommon");
    const removed = toggleAutoSellRarity(uncommon, "common");

    expect(common.autoSellRarities).toEqual(["common"]);
    expect(uncommon.autoSellRarities).toEqual(["common", "uncommon"]);
    expect(removed.autoSellRarities).toEqual(["uncommon"]);
  });

  it("tracks and claims guild contract rewards once", () => {
    const base = createInitialGameState(1_000);
    const ready = {
      ...base,
      highestStage: 10,
      stage: 10,
      kills: 55,
      level: 15,
      inventory: Array.from({ length: 8 }, (_value, index) => ({
        id: `contract-item-${index}`,
        slot: "blade" as const,
        rarity: "common" as const,
        level: 1,
        power: 1,
        name: "Common Starforged Blade",
        droppedAtStage: 1
      }))
    };

    const contracts = deriveContracts(ready);
    expect(contracts.filter((contract) => contract.completed)).toHaveLength(4);

    const claimed = claimContract(ready, "stage-10");
    expect(claimed.claimedContracts).toContain("stage-10");
    expect(claimed.gold).toBe(ready.gold + 180);
    expect(claimed.parts).toBe(ready.parts + 14);
    expect(claimed.levelPoints).toBe(ready.levelPoints + 1);
    expect(claimed.runLog[0]).toMatchObject({
      kind: "contract",
      title: "Goal claimed",
      detail: "Brassworks Breakthrough"
    });

    const claimedAgain = claimContract(claimed, "stage-10");
    expect(claimedAgain.gold).toBe(claimed.gold);
    expect(claimedAgain.claimedContracts.filter((id) => id === "stage-10")).toHaveLength(1);
  });

  it("claims all ready guild contracts in one action", () => {
    const base = createInitialGameState(1_000);
    const ready: GameState = {
      ...base,
      stage: 60,
      highestStage: 60,
      kills: 80,
      bossesDefeated: 3,
      level: 15,
      heroHp: 1,
      inventory: Array.from({ length: 8 }, (_value, index) => ({
        id: `claim-all-item-${index}`,
        slot: "blade",
        rarity: "common",
        level: index + 1,
        power: index + 2,
        name: `Claim All Test ${index}`,
        droppedAtStage: index + 1
      }))
    };

    const claimed = claimAllContracts(ready);

    expect(claimed.claimedContracts).toEqual([
      "stage-10",
      "kills-50",
      "bosses-3",
      "level-15",
      "equipment-8",
      "stage-60"
    ]);
    expect(claimed.gold).toBe(ready.gold + 2700);
    expect(claimed.parts).toBe(ready.parts + 163);
    expect(claimed.relics).toBe(ready.relics + 5);
    expect(claimed.essence).toBe(ready.essence + 10);
    expect(claimed.levelPoints).toBe(ready.levelPoints + 6);
    expect(claimed.heroHp).toBeGreaterThan(ready.heroHp);
    expect(claimAllContracts(claimed)).toBe(claimed);
  });

  it("extends guild contracts through the full campaign", () => {
    const base = createInitialGameState(1_000);
    const endgame: GameState = {
      ...base,
      stage: 120,
      highestStage: 120,
      kills: 220,
      bossesDefeated: 12,
      level: 25,
      inventory: Array.from({ length: 16 }, (_value, index) => ({
        id: `endgame-contract-item-${index}`,
        slot: "engine",
        rarity: index % 4 === 0 ? "rare" : "common",
        level: 20 + index,
        power: 40 + index,
        name: `Endgame Contract Engine ${index}`,
        droppedAtStage: 80 + index
      }))
    };

    const contracts = deriveContracts(endgame);
    const completed = contracts.filter((contract) => contract.completed);

    expect(contracts).toHaveLength(12);
    expect(completed).toHaveLength(12);
    expect(completed.map((contract) => contract.id)).toEqual([
      "stage-10",
      "kills-50",
      "bosses-3",
      "level-15",
      "equipment-8",
      "stage-60",
      "bosses-6",
      "stage-90",
      "level-25",
      "equipment-16",
      "bosses-12",
      "stage-120"
    ]);

    const claimed = claimAllContracts(endgame);
    expect(claimed.claimedContracts).toHaveLength(12);
    expect(claimed.gold).toBeGreaterThan(endgame.gold + 10000);
    expect(claimed.parts).toBeGreaterThan(endgame.parts + 800);
    expect(claimed.essence).toBeGreaterThan(endgame.essence + 35);
    expect(claimed.relics).toBeGreaterThan(endgame.relics + 15);
    expect(claimed.levelPoints).toBeGreaterThan(endgame.levelPoints + 20);
  });

  it("applies capped offline rewards", () => {
    const state = createInitialGameState(1_000);
    const progressed = applyOfflineProgress(state, 10 * 60 * 60 * 1000);

    expect(progressed.lastOfflineReward?.seconds).toBe(8 * 60 * 60);
    expect(progressed.lastOfflineReward?.capped).toBe(true);
    expect(progressed.gold).toBeGreaterThan(0);
    expect(progressed.xp).toBeGreaterThanOrEqual(0);
  });

  it("lets players farm a stable stage without auto-advancing", () => {
    let state = setBattlePlan({ ...createInitialGameState(1_000), stage: 6, highestStage: 6 }, "farm");
    for (let index = 0; index < 16; index += 1) {
      state = tick({ ...state, enemyHp: 1, overdrive: 100 }, 250, 1_250 + index);
    }

    expect(state.battlePlan).toBe("farm");
    expect(state.stage).toBe(6);
    expect(state.highestStage).toBe(6);
    expect(state.kills).toBeGreaterThanOrEqual(16);
  });

  it("moves a farming plan off boss stages and suppresses offline stage pushes", () => {
    const bossState = {
      ...createInitialGameState(1_000),
      stage: 10,
      highestStage: 10,
      lastSavedAt: 1_000
    };
    const farming = setBattlePlan(bossState, "farm");
    const offline = applyOfflineProgress(farming, 60 * 60 * 1000);

    expect(farming.stage).toBe(9);
    expect(offline.stage).toBe(9);
    expect(offline.lastOfflineReward?.stages).toBe(0);
    expect(offline.gold).toBeGreaterThan(0);
  });

  it("holds active and offline progression without rewards", () => {
    const state = {
      ...createInitialGameState(1_000),
      battlePlan: "hold" as const,
      stage: 14,
      highestStage: 14,
      enemyHp: 1,
      overdrive: 100,
      lastSavedAt: 1_000
    };
    const held = tick(state, 2_000, 3_000);
    const offline = applyOfflineProgress(state, 60 * 60 * 1000);

    expect(held.stage).toBe(14);
    expect(held.kills).toBe(0);
    expect(held.enemyHp).toBe(1);
    expect(held.lastSavedAt).toBe(3_000);
    expect(offline.stage).toBe(14);
    expect(offline.gold).toBe(0);
    expect(offline.xp).toBe(0);
    expect(offline.lastOfflineReward).toMatchObject({
      seconds: 3_599,
      gold: 0,
      xp: 0,
      parts: 0,
      essence: 0,
      stages: 0,
      capped: false
    });
  });

  it("retries the current stage without changing progression or economy", () => {
    const state = {
      ...createInitialGameState(1_000),
      stage: 10,
      highestStage: 10,
      level: 8,
      gold: 1200,
      parts: 24,
      essence: 1,
      heroHp: 12,
      enemyHp: 31,
      enemySeed: 4,
      overdrive: 65
    };
    const stats = deriveStats(state);
    const retried = retryCurrentStage(state);

    expect(retried.stage).toBe(10);
    expect(retried.highestStage).toBe(10);
    expect(retried.gold).toBe(1200);
    expect(retried.parts).toBe(24);
    expect(retried.essence).toBe(1);
    expect(retried.heroHp).toBe(stats.maxHp);
    expect(retried.enemyHp).toBe(stats.enemyMaxHp);
    expect(retried.enemySeed).toBe(5);
    expect(retried.overdrive).toBe(65);
  });

  it("travels to unlocked route stages without crossing best progress", () => {
    const state = {
      ...createInitialGameState(1_000),
      stage: 37,
      zone: 4,
      highestStage: 45,
      heroHp: 12,
      enemyHp: 24,
      enemySeed: 9,
      overdrive: 145
    };
    const travelled = travelToStage(state, 21);
    const stats = deriveStats(travelled);

    expect(travelled.stage).toBe(21);
    expect(travelled.zone).toBe(3);
    expect(travelled.highestStage).toBe(45);
    expect(travelled.heroHp).toBe(stats.maxHp);
    expect(travelled.enemyHp).toBe(stats.enemyMaxHp);
    expect(travelled.enemySeed).toBe(10);
    expect(travelled.overdrive).toBe(100);
    expect(travelled.runLog[0]).toMatchObject({
      kind: "travel",
      title: "Traveled to Boiler Docks",
      stage: 21
    });

    const clamped = travelToStage(state, 81);
    expect(clamped.stage).toBe(45);
    expect(clamped.zone).toBe(5);
  });

  it("keeps farm travel off boss stages", () => {
    const farming = {
      ...createInitialGameState(1_000),
      battlePlan: "farm" as const,
      stage: 14,
      highestStage: 30
    };
    const travelled = travelToStage(farming, 30);

    expect(travelled.stage).toBe(29);
    expect(travelled.zone).toBe(3);
    expect(deriveStats(travelled).stageBoss).toBe(false);
  });

  it("derives challenge tower readiness from route progress and power", () => {
    const early = createInitialGameState(1_000);
    const earlyTrials = deriveChallengeTrials(early);

    expect(earlyTrials).toHaveLength(3);
    expect(earlyTrials[0]).toMatchObject({
      title: "Brassworks Pressure Trial",
      requiredStage: 20,
      ready: false,
      cleared: false
    });

    const late = {
      ...early,
      highestStage: maxStage,
      stage: maxStage,
      level: 60,
      bossesDefeated: 12,
      campaignCleared: true,
      relics: 20,
      gear: {
        blade: 30,
        armor: 30,
        banner: 30,
        goggles: 30,
        engine: 30
      }
    };
    const lateTrials = deriveChallengeTrials(late);

    expect(lateTrials.every((trial) => trial.ready)).toBe(true);
    expect(lateTrials.every((trial) => trial.cleared)).toBe(true);
    expect(lateTrials[2].regionName).toBe("Clocktower Crown");
  });

  it("reaches the first boss milestone within a 15-minute assisted playtest", () => {
    const state = runAssistedPlaythrough(15);
    const upgradedGear = gearOrder.filter((key) => state.gear[key] > 1);
    const upgradedSkills = skillOrder.filter((key) => state.skills[key] > 0);

    expect(state.highestStage).toBeGreaterThanOrEqual(10);
    expect(state.bossesDefeated).toBeGreaterThanOrEqual(1);
    expect(state.level).toBeGreaterThanOrEqual(3);
    expect(state.kills).toBeGreaterThan(10);
    expect(upgradedGear.length).toBeGreaterThanOrEqual(3);
    expect(upgradedSkills.length).toBeGreaterThanOrEqual(1);
    expect(state.inventory.length).toBeGreaterThan(0);
    expect(state.heroHp).toBeGreaterThan(0);
  });

  it("survives a 30-minute assisted playthrough with meaningful progression", () => {
    const state = runAssistedPlaythrough(30);
    const stats = deriveStats(state);

    expect(Number.isFinite(stats.powerScore)).toBe(true);
    expect(Number.isFinite(state.gold)).toBe(true);
    expect(state.highestStage).toBeGreaterThanOrEqual(10);
    expect(state.bossesDefeated).toBeGreaterThanOrEqual(1);
    expect(state.level).toBeGreaterThanOrEqual(4);
    expect(state.totalGold).toBeGreaterThan(400);
    expect(state.kills).toBeGreaterThan(20);
    expect(state.inventory.length).toBeGreaterThan(0);
    expect(state.stage).toBeLessThanOrEqual(maxStage);
    expect(state.heroHp).toBeGreaterThan(0);
  });

  it("survives a 2-hour assisted soak with midgame economy and reforge readiness", () => {
    const state = runAssistedPlaythrough(120);
    const stats = deriveStats(state);
    const contracts = deriveContracts(state);
    const completedContracts = contracts.filter((contract) => contract.completed);

    expect(Number.isFinite(stats.powerScore)).toBe(true);
    expect(Number.isFinite(state.gold)).toBe(true);
    expect(Number.isFinite(state.parts)).toBe(true);
    expect(Number.isFinite(state.essence)).toBe(true);
    expect(state.highestStage).toBeGreaterThanOrEqual(30);
    expect(state.bossesDefeated).toBeGreaterThanOrEqual(3);
    expect(state.level).toBeGreaterThanOrEqual(15);
    expect(state.inventory.length).toBeGreaterThanOrEqual(8);
    expect(completedContracts.length).toBeGreaterThanOrEqual(4);
    expect(state.claimedContracts).toContain("stage-10");
    expect(state.claimedContracts).toContain("kills-50");
    expect(state.claimedContracts).toContain("bosses-3");
    expect(state.claimedContracts).toContain("level-15");
    expect(state.stage).toBeLessThanOrEqual(maxStage);
    expect(state.heroHp).toBeGreaterThan(0);

    const reforged = ascend(state);
    expect(reforged.stage).toBe(1);
    expect(reforged.relics).toBeGreaterThan(state.relics);
    expect(reforged.highestStage).toBe(state.highestStage);
    expect(reforged.seenBossStories.length).toBeGreaterThanOrEqual(3);
  });

  it("can complete the full 120-stage campaign in assisted simulation", () => {
    const state = runAssistedPlaythrough(60);
    const stats = deriveStats(state);
    const ending = deriveStoryArchive(state).find((entry) => entry.id === "campaign-ending");

    expect(state.campaignCleared).toBe(true);
    expect(state.stage).toBe(maxStage);
    expect(state.highestStage).toBe(maxStage);
    expect(state.bossesDefeated).toBe(12);
    expect(state.seenBossStories).toContain(12);
    expect(ending?.unlocked).toBe(true);
    expect(stats.stageBoss).toBe(false);
    expect(Number.isFinite(stats.powerScore)).toBe(true);
    expect(state.heroHp).toBeGreaterThan(0);
  });
});

function runAssistedPlaythrough(minutes: number): GameState {
  let state = createInitialGameState(1_000);

  for (let step = 0; step < minutes * 60 * 4; step += 1) {
    state = automateBuildChoices(state);
    state = tick(state, 250, 1_000 + step * 250);
    if (state.pendingBossStory) {
      state = acknowledgeBossStory(state, state.pendingBossStory.id);
    }
  }

  return automateBuildChoices(state);
}

function automateBuildChoices(state: GameState): GameState {
  let next = claimReadyContracts(equipBestDrops(state));

  for (let pass = 0; pass < 16; pass += 1) {
    const before = signature(next);
    next = claimReadyContracts(next);
    next = buyAffordableGear(next);
    next = buyAffordableSkill(next);
    next = equipBestDrops(next);
    next = claimReadyContracts(next);
    if (signature(next) === before) {
      break;
    }
  }

  return next;
}

function claimReadyContracts(state: GameState): GameState {
  return deriveContracts(state).reduce((next, contract) => {
    if (contract.completed && !contract.claimed) {
      return claimContract(next, contract.id);
    }
    return next;
  }, state);
}

function buyAffordableGear(state: GameState): GameState {
  const affordable = gearOrder
    .map((key) => ({ key, cost: getGearCost(state, key), partCost: getGearPartCost(state, key), level: state.gear[key] }))
    .filter((candidate) => state.gold >= candidate.cost && state.parts >= candidate.partCost)
    .sort((left, right) => left.level - right.level || left.cost + left.partCost * 15 - (right.cost + right.partCost * 15));

  return affordable[0] ? buyGear(state, affordable[0].key) : state;
}

function buyAffordableSkill(state: GameState): GameState {
  const affordable = skillOrder
    .map((key) => ({
      key,
      cost: getSkillCost(state, key),
      essenceCost: getSkillEssenceCost(state, key),
      level: state.skills[key]
    }))
    .filter((candidate) => state.relics >= candidate.cost && state.essence >= candidate.essenceCost)
    .sort((left, right) => left.level - right.level || left.cost + left.essenceCost * 5 - (right.cost + right.essenceCost * 5));

  return affordable[0] ? buySkill(state, affordable[0].key) : state;
}

function equipBestDrops(state: GameState): GameState {
  let next = state;

  for (const slot of gearOrder) {
    const currentPower = next.inventory.find((item) => item.id === next.equipped[slot])?.power ?? 0;
    const best = next.inventory
      .filter((item) => item.slot === slot)
      .sort((left, right) => right.power - left.power)[0];
    if (best && best.power > currentPower) {
      next = equipItem(next, best.id);
    }
  }

  return next;
}

function signature(state: GameState) {
  return [
    state.gold,
    state.parts,
    state.relics,
    state.essence,
    state.claimedContracts.join(","),
    ...gearOrder.map((key) => state.gear[key]),
    ...skillOrder.map((key) => state.skills[key]),
    ...gearOrder.map((key) => state.equipped[key] ?? "-")
  ].join("|");
}
