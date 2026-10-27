import { appBuildInfo } from "./build-info";
import { deriveContracts, deriveStats, type GameState } from "./game";
import type { AudioSettings, DisplayMode, RuntimeSettings, WindowSettings } from "./types";

export type DiagnosticsSettings = {
  displayMode: DisplayMode;
  audioSettings: AudioSettings;
  runtimeSettings: RuntimeSettings;
  windowSettings: WindowSettings;
};

export function serializeDiagnosticsReport(
  state: GameState,
  settings: DiagnosticsSettings,
  now = Date.now(),
  runtime: { userAgent?: string; platform?: string } = {}
) {
  const stats = deriveStats(state);
  const contracts = deriveContracts(state);
  const report = {
    kind: "afk-hero-diagnostics",
    version: 1,
    exportedAt: now,
    build: appBuildInfo,
    runtime: {
      userAgent: runtime.userAgent ?? "",
      platform: runtime.platform ?? ""
    },
    settings,
    progression: {
      stage: state.stage,
      highestStage: state.highestStage,
      stageCap: stats.stageCap,
      zone: state.zone,
      regionName: stats.regionName,
      level: state.level,
      xp: state.xp,
      xpToNext: stats.xpToNext,
      campaignCleared: state.campaignCleared,
      battlePlan: state.battlePlan,
      bossesDefeated: state.bossesDefeated,
      seenBossStories: state.seenBossStories.length,
      pendingBossStory: state.pendingBossStory?.title ?? null
    },
    economy: {
      gold: state.gold,
      relics: state.relics,
      parts: state.parts,
      essence: state.essence,
      levelPoints: state.levelPoints,
      totalGold: state.totalGold
    },
    combat: {
      heroHp: Math.round(state.heroHp),
      maxHp: stats.maxHp,
      enemyName: stats.enemyName,
      enemyHp: Math.round(state.enemyHp),
      enemyMaxHp: stats.enemyMaxHp,
      stageBoss: stats.stageBoss,
      damage: stats.damage,
      defense: stats.defense,
      critChance: stats.critChance,
      overdrive: Math.round(state.overdrive),
      powerScore: stats.powerScore
    },
    inventory: {
      stored: state.inventory.length,
      equipped: state.equipped,
      highestPower: state.inventory.reduce((highest, item) => Math.max(highest, item.power), 0)
    },
    contracts: {
      completed: contracts.filter((contract) => contract.completed).length,
      claimed: contracts.filter((contract) => contract.claimed).length,
      total: contracts.length
    },
    offlineReward: state.lastOfflineReward ?? null,
    save: {
      lastSavedAt: state.lastSavedAt,
      introSeen: state.introSeen
    }
  };

  return JSON.stringify(report, null, 2);
}
