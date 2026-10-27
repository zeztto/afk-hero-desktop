export type GearKey = "blade" | "armor" | "banner" | "goggles" | "engine";
export type SkillKey = "cleave" | "bulwark" | "treasury" | "pressure" | "salvage";
export type EquipmentRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type ContractMetric = "stage" | "kills" | "bosses" | "level" | "equipment";
export type BattlePlan = "push" | "farm" | "hold";
export type RunLogKind = "boss" | "contract" | "loot" | "reforge" | "travel";

export const maxStage = 120;
export const maxSkillRank = 5;
export const bossInterval = 10;
const regionSize = 20;
const maxOverdrive = 100;
const maxRunLogEntries = 12;
const equipmentSlots: GearKey[] = ["blade", "armor", "banner", "goggles", "engine"];
const skillSlots: SkillKey[] = ["cleave", "bulwark", "treasury", "pressure", "salvage"];
const finalBossStoryId = Math.floor(maxStage / bossInterval);

export type GameState = {
  version: 1;
  heroName: string;
  level: number;
  xp: number;
  levelPoints: number;
  gold: number;
  relics: number;
  parts: number;
  essence: number;
  stage: number;
  zone: number;
  highestStage: number;
  heroHp: number;
  enemyHp: number;
  enemySeed: number;
  overdrive: number;
  gear: Record<GearKey, number>;
  skills: Record<SkillKey, number>;
  inventory: EquipmentItem[];
  equipped: Record<GearKey, string | null>;
  autoSellRarities: EquipmentRarity[];
  kills: number;
  bossesDefeated: number;
  totalGold: number;
  claimedContracts: string[];
  introSeen: boolean;
  seenBossStories: number[];
  pendingBossStory?: BossStoryCue;
  campaignCleared: boolean;
  battlePlan: BattlePlan;
  runLog: RunLogEntry[];
  lastSavedAt: number;
  lastOfflineReward?: OfflineReward;
};

export type ContractReward = {
  gold?: number;
  parts?: number;
  essence?: number;
  relics?: number;
  levelPoints?: number;
};

export type GuildContract = {
  id: string;
  title: string;
  metric: ContractMetric;
  target: number;
  reward: ContractReward;
};

export type ContractProgress = GuildContract & {
  progress: number;
  completed: boolean;
  claimed: boolean;
};

export type DerivedStats = {
  maxHp: number;
  damage: number;
  defense: number;
  critChance: number;
  goldBonus: number;
  xpToNext: number;
  enemyName: string;
  enemyMaxHp: number;
  enemyDamage: number;
  enemyTraitLabel: string;
  enemyTraitDetail: string;
  enemyVariantIndex: number;
  stageBoss: boolean;
  regionName: string;
  regionIndex: number;
  nextBossStage: number;
  stageCap: number;
  overdriveDamage: number;
  bountyMultiplier: number;
  rewardMultiplier: number;
  overdriveChargeMultiplier: number;
  powerScore: number;
};

export type BattleForecast = {
  clearSeconds: number;
  goldPerMinute: number;
  xpPerMinute: number;
  offlineCapHours: number;
  stageRequirement: number;
};

export type CombatFeedback = {
  hitDamage: number;
  critDamage: number;
  burstDamage: number;
  incomingDamage: number;
  threatLabel: "Stable" | "Guarded" | "Danger";
};

export type RewardPreview = {
  gold: number;
  xp: number;
  parts: number;
  essence: number;
  relics: number;
  dropLabel: string;
};

export type RunReport = {
  routeProgressPercent: number;
  bossesCleared: number;
  bossesTotal: number;
  readyContracts: number;
  claimedContracts: number;
  contractTotal: number;
  equippedSlots: number;
  equipmentPower: number;
  nextMilestoneLabel: string;
  nextMilestoneProgress: number;
  nextMilestoneTarget: number;
  nextActionLabel: string;
  nextActionDetail: string;
  nextActionReady: boolean;
  pressureRank: "Rookie" | "Operator" | "Vanguard" | "Clockwork Legend";
};

export type Achievement = {
  id: string;
  title: string;
  detail: string;
  progress: number;
  target: number;
  unlocked: boolean;
};

type RecommendedRunAction =
  | {
      kind: "claim-goals";
      label: string;
      detail: string;
      ready: true;
      level: number;
      shortageScore: number;
    }
  | {
      kind: "gear";
      key: GearKey;
      label: string;
      detail: string;
      ready: boolean;
      level: number;
      shortageScore: number;
    }
  | {
      kind: "skill";
      key: SkillKey;
      label: string;
      detail: string;
      ready: boolean;
      level: number;
      shortageScore: number;
    }
  | {
      kind: "craft";
      label: string;
      detail: string;
      ready: boolean;
      level: number;
      shortageScore: number;
    }
  | {
      kind: "wait" | "complete";
      label: string;
      detail: string;
      ready: boolean;
      level: number;
      shortageScore: number;
    };

export type UpgradePreview = {
  powerGain: number;
  effectLabel: string;
};

export type ForgeAllPreview = {
  available: boolean;
  totalUpgrades: number;
  goldCost: number;
  partsCost: number;
  targetLevels: Record<GearKey, number>;
  nextUpgradeLabel: string;
};

export type CraftingPreview = {
  available: boolean;
  slot: GearKey;
  rarity: EquipmentRarity;
  partsCost: number;
  essenceCost: number;
  itemPower: number;
  itemName: string;
};

export type ReforgePreview = {
  available: boolean;
  earnedRelics: number;
  retainedParts: number;
  retainedSkillRanks: number;
  retainedEquipment: number;
  nextRelicDamageBonusPercent: number;
};

export type SkillRefund = {
  relics: number;
  essence: number;
  levelPoints: number;
};

export type OfflineReward = {
  seconds: number;
  gold: number;
  xp: number;
  parts: number;
  essence: number;
  stages: number;
  capped: boolean;
};

export type BossStoryCue = {
  id: number;
  bossName: string;
  regionName: string;
  title: string;
  body: string;
};

export type RunLogEntry = {
  id: string;
  kind: RunLogKind;
  title: string;
  detail: string;
  stage: number;
  at: number;
};

export type StoryArchiveEntry = {
  id: string;
  title: string;
  regionName: string;
  body: string;
  unlocked: boolean;
};

export type BestiaryEntry = {
  regionName: string;
  unlocked: boolean;
  enemyNames: string[];
  enemyTraits: string[];
  bossName: string;
  bossMechanic: string;
  bossDetail: string;
};

export type ChallengeTrial = {
  id: string;
  title: string;
  regionName: string;
  requiredStage: number;
  requiredPower: number;
  currentPower: number;
  ready: boolean;
  cleared: boolean;
  rewardLabel: string;
  detail: string;
};

export type EquipmentItem = {
  id: string;
  slot: GearKey;
  rarity: EquipmentRarity;
  level: number;
  power: number;
  name: string;
  droppedAtStage: number;
  locked?: boolean;
};

export const gearLabels: Record<GearKey, string> = {
  blade: "Starforged Blade",
  armor: "Dawnplate Armor",
  banner: "Guild Banner",
  goggles: "Aether Goggles",
  engine: "Pocket Engine"
};

export const rarityLabels: Record<EquipmentRarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary"
};

export const autoSellRarityOptions: EquipmentRarity[] = ["common", "uncommon"];

const rarityPower: Record<EquipmentRarity, number> = {
  common: 1,
  uncommon: 1.22,
  rare: 1.52,
  epic: 1.92,
  legendary: 2.55
};

export const skillLabels: Record<SkillKey, string> = {
  cleave: "Cleave Protocol",
  bulwark: "Resting Bulwark",
  treasury: "Golden Route",
  pressure: "Pressure Release",
  salvage: "Salvage Crew"
};

export const regionNames = [
  "Brassworks Alley",
  "Boiler Docks",
  "Aether Rail",
  "Smog Cathedral",
  "Clocktower Crown",
  "Void Foundry"
];

export const guildContracts: GuildContract[] = [
  {
    id: "stage-10",
    title: "Brassworks Breakthrough",
    metric: "stage",
    target: 10,
    reward: { gold: 180, parts: 14, levelPoints: 1 }
  },
  {
    id: "kills-50",
    title: "Machine Sweep",
    metric: "kills",
    target: 50,
    reward: { gold: 420, parts: 24 }
  },
  {
    id: "bosses-3",
    title: "Sealbreaker",
    metric: "bosses",
    target: 3,
    reward: { relics: 2, essence: 3, levelPoints: 1 }
  },
  {
    id: "level-15",
    title: "Veteran Engineer",
    metric: "level",
    target: 15,
    reward: { gold: 1200, parts: 55, levelPoints: 2 }
  },
  {
    id: "equipment-8",
    title: "Foundry Armory",
    metric: "equipment",
    target: 8,
    reward: { gold: 900, parts: 70, essence: 2 }
  },
  {
    id: "stage-60",
    title: "Upper City Route",
    metric: "stage",
    target: 60,
    reward: { relics: 3, essence: 5, levelPoints: 2 }
  },
  {
    id: "bosses-6",
    title: "Six-Seal Breaker",
    metric: "bosses",
    target: 6,
    reward: { relics: 3, essence: 6, levelPoints: 2 }
  },
  {
    id: "stage-90",
    title: "Clocktower Ascent",
    metric: "stage",
    target: 90,
    reward: { gold: 3000, parts: 120, essence: 6, levelPoints: 2 }
  },
  {
    id: "level-25",
    title: "Master Engineer",
    metric: "level",
    target: 25,
    reward: { relics: 2, parts: 140, levelPoints: 3 }
  },
  {
    id: "equipment-16",
    title: "Legendary Armory",
    metric: "equipment",
    target: 16,
    reward: { gold: 2500, parts: 180, essence: 5 }
  },
  {
    id: "bosses-12",
    title: "Twelve-Seal Victory",
    metric: "bosses",
    target: 12,
    reward: { relics: 5, essence: 10, levelPoints: 4 }
  },
  {
    id: "stage-120",
    title: "Void Foundry Cleared",
    metric: "stage",
    target: 120,
    reward: { gold: 6000, parts: 300, relics: 4, essence: 12, levelPoints: 5 }
  }
];

export const openingStory = [
  {
    title: "The Last Warm Engine",
    body: "The Brassworks city is losing pressure. Ari takes the guild's last pocket engine and enters the old furnace roads alone."
  },
  {
    title: "Idle Does Not Mean Still",
    body: "Every cleared machine returns heat, parts, and relic memory to the workshop. The city rebuilds while the expedition keeps moving."
  },
  {
    title: "The Six Pressure Seals",
    body: "Six bosses hold the sealed districts shut. Break their engines, recover the aether essence, and reopen the route to the Void Foundry."
  }
];

const enemyNamesByRegion = [
  ["Coal Tick", "Pipe Rat", "Gauge Imp", "Brass Squire", "Valve Prowler", "Ash Riveter"],
  ["Steam Crab", "Dock Warden", "Rivet Bruiser", "Boiler Shade", "Anchor Driller", "Tide Engine"],
  ["Rail Scout", "Aether Bat", "Signal Knight", "Copper Nomad", "Piston Herald", "Linebreaker"],
  ["Smog Acolyte", "Bellows Ghoul", "Censer Guard", "Ash Prophet", "Chapel Gear", "Furnace Choir"],
  ["Gear Valkyrie", "Pendulum Mage", "Chrono Knight", "Clockwork Baron", "Crown Gearguard", "Minute Lance"],
  ["Void Riveter", "Null Engine", "Abyss Foreman", "Eclipse Captain", "Core Splitter", "Black Gauge"]
];

const normalEnemyProfiles = [
  {
    label: "Scrapper",
    detail: "Balanced pressure",
    hpMultiplier: 1,
    damageMultiplier: 1,
    rewardMultiplier: 1,
    overdriveChargeMultiplier: 1
  },
  {
    label: "Armored",
    detail: "Heavy shell",
    hpMultiplier: 1.18,
    damageMultiplier: 0.94,
    rewardMultiplier: 1.04,
    overdriveChargeMultiplier: 0.96
  },
  {
    label: "Aerial",
    detail: "Fast pressure",
    hpMultiplier: 0.9,
    damageMultiplier: 1.13,
    rewardMultiplier: 1.05,
    overdriveChargeMultiplier: 1.05
  },
  {
    label: "Zealot",
    detail: "Steady burn",
    hpMultiplier: 1.06,
    damageMultiplier: 1.12,
    rewardMultiplier: 1.07,
    overdriveChargeMultiplier: 1
  },
  {
    label: "Duelist",
    detail: "High damage",
    hpMultiplier: 0.96,
    damageMultiplier: 1.2,
    rewardMultiplier: 1.08,
    overdriveChargeMultiplier: 1.04
  },
  {
    label: "Volatile",
    detail: "Rich salvage",
    hpMultiplier: 1.12,
    damageMultiplier: 1.16,
    rewardMultiplier: 1.14,
    overdriveChargeMultiplier: 1.12
  }
];

const bossNames = [
  "Boiler Regent",
  "Harbor Gearlord",
  "Aether Conductor",
  "Cathedral Furnace",
  "Clocktower Warden",
  "Void Foundry King"
];

const bossMechanics = [
  {
    label: "Pressure Crown",
    detail: "Reinforced boiler",
    hpMultiplier: 1.1,
    damageMultiplier: 1.05,
    rewardMultiplier: 1.15,
    overdriveChargeMultiplier: 0.92
  },
  {
    label: "Anchor Lock",
    detail: "Heavy counterfire",
    hpMultiplier: 1.05,
    damageMultiplier: 1.14,
    rewardMultiplier: 1.16,
    overdriveChargeMultiplier: 0.9
  },
  {
    label: "Rail Surge",
    detail: "Rapid strikes",
    hpMultiplier: 0.98,
    damageMultiplier: 1.22,
    rewardMultiplier: 1.18,
    overdriveChargeMultiplier: 1.08
  },
  {
    label: "Smog Ward",
    detail: "Thick defenses",
    hpMultiplier: 1.2,
    damageMultiplier: 1.08,
    rewardMultiplier: 1.2,
    overdriveChargeMultiplier: 0.86
  },
  {
    label: "Time Lock",
    detail: "Punishing cadence",
    hpMultiplier: 1.12,
    damageMultiplier: 1.18,
    rewardMultiplier: 1.22,
    overdriveChargeMultiplier: 0.88
  },
  {
    label: "Void Core",
    detail: "Final pressure",
    hpMultiplier: 1.24,
    damageMultiplier: 1.22,
    rewardMultiplier: 1.35,
    overdriveChargeMultiplier: 0.82
  }
];

const bossStoryBodies = [
  "The Boiler Regent falls and the alley valves turn again. Brassworks homes glow with furnace light for the first time in weeks.",
  "The Harbor Gearlord's cranes stop grinding the docks. Salvage crews can now move parts through the tide locks.",
  "The Aether Conductor releases the rail spine. Supply cars begin to cross the skyline under their own steam.",
  "The Cathedral Furnace goes quiet. The smog bells clear and the old district opens its chapel foundry.",
  "The Clocktower Warden drops the crown key. Time locks across the upper city release in one clean chime.",
  "The Void Foundry King breaks apart in the core pit. Ari has enough essence to light a new city engine."
];

const challengeTrials = [
  {
    id: "brassworks-trial",
    title: "Brassworks Pressure Trial",
    requiredStage: 20,
    requiredPower: 180,
    rewardLabel: "Relic cache + gear focus",
    detail: "Hold the lower city pumps against a timed machine wave."
  },
  {
    id: "rail-trial",
    title: "Aether Rail Gauntlet",
    requiredStage: 60,
    requiredPower: 520,
    rewardLabel: "Essence cache + route badge",
    detail: "Push through signal gates while overdrive charge is throttled."
  },
  {
    id: "foundry-trial",
    title: "Void Foundry Ordeal",
    requiredStage: 120,
    requiredPower: 1100,
    rewardLabel: "Legend badge + reforge plan",
    detail: "Challenge the stabilized final engine after the campaign route is charted."
  }
];

export const campaignEndingStory = {
  title: "A New City Engine",
  body: "Ari locks the recovered essence into the last warm engine. Brassworks pressure rises across all six districts, and the expedition becomes a steady watch over the reopened city."
};

export function createInitialGameState(now = Date.now()): GameState {
  const state: GameState = {
    version: 1,
    heroName: "Ari",
    level: 1,
    xp: 0,
    levelPoints: 0,
    gold: 0,
    relics: 0,
    parts: 0,
    essence: 0,
    stage: 1,
    zone: 1,
    highestStage: 1,
    heroHp: 120,
    enemyHp: 55,
    enemySeed: 0,
    overdrive: 0,
    gear: {
      blade: 1,
      armor: 1,
      banner: 1,
      goggles: 1,
      engine: 1
    },
    skills: {
      cleave: 0,
      bulwark: 0,
      treasury: 0,
      pressure: 0,
      salvage: 0
    },
    inventory: [],
    equipped: {
      blade: null,
      armor: null,
      banner: null,
      goggles: null,
      engine: null
    },
    autoSellRarities: [],
    kills: 0,
    bossesDefeated: 0,
    totalGold: 0,
    claimedContracts: [],
    introSeen: false,
    seenBossStories: [],
    campaignCleared: false,
    battlePlan: "push",
    runLog: [],
    lastSavedAt: now
  };

  const stats = deriveStats(state);
  state.heroHp = stats.maxHp;
  state.enemyHp = stats.enemyMaxHp;
  return state;
}

function deriveEnemyProfile(state: GameState, stage: number, regionIndex: number, stageBoss: boolean) {
  if (stageBoss) {
    const mechanic = bossMechanics[regionIndex % bossMechanics.length];
    return {
      ...mechanic,
      variantIndex: regionIndex
    };
  }

  const enemies = enemyNamesByRegion[regionIndex];
  const variantIndex = Math.abs(state.enemySeed + stage + regionIndex * 2) % enemies.length;
  return {
    ...normalEnemyProfiles[variantIndex % normalEnemyProfiles.length],
    variantIndex
  };
}

export function deriveStats(state: GameState): DerivedStats {
  const stage = Math.min(maxStage, Math.max(1, state.stage));
  const regionIndex = getRegionIndex(stage);
  const stageBoss = stage % bossInterval === 0 && !state.campaignCleared;
  const enemyProfile = deriveEnemyProfile(state, stage, regionIndex, stageBoss);
  const relicBonus = 1 + state.relics * 0.04;
  const blade = state.gear.blade;
  const armor = state.gear.armor;
  const banner = state.gear.banner;
  const goggles = state.gear.goggles;
  const engine = state.gear.engine;
  const bladeItem = getEquippedPower(state, "blade");
  const armorItem = getEquippedPower(state, "armor");
  const bannerItem = getEquippedPower(state, "banner");
  const gogglesItem = getEquippedPower(state, "goggles");
  const engineItem = getEquippedPower(state, "engine");
  const pressureBonus = 1 + state.skills.pressure * 0.055;
  const maxHp = Math.round((120 + state.level * 22 + armor * 48 + armorItem * 18 + engine * 18 + engineItem * 8) * (1 + state.skills.bulwark * 0.085));
  const damage = Math.round((14 + state.level * 4.8 + blade * 11 + bladeItem * 5 + engine * 3.5 + engineItem * 2) * relicBonus * pressureBonus);
  const defense = Math.round(armor * 3.2 + armorItem * 1.4 + state.skills.bulwark * 4 + engine * 0.9);
  const critChance = Math.min(0.48, 0.055 + state.skills.cleave * 0.026 + goggles * 0.009 + gogglesItem * 0.002);
  const bountyMultiplier = 1 + Math.floor(stage / 20) * 0.08;
  const goldBonus = 1 + banner * 0.085 + bannerItem * 0.014 + goggles * 0.018 + state.skills.treasury * 0.12 + state.skills.salvage * 0.08 + state.relics * 0.022;
  const regionPressure = 1 + regionIndex * 0.26;
  const stageCurve = 42 + stage * 19 + Math.pow(stage, 1.18) * 5.4;
  const enemyMaxHp = Math.round(stageCurve * regionPressure * (stageBoss ? 3.8 : 1) * enemyProfile.hpMultiplier);
  const enemyDamage = Math.round((8 + stage * 2.55 + regionIndex * 9) * (stageBoss ? 1.52 : 1) * enemyProfile.damageMultiplier);
  const enemies = enemyNamesByRegion[regionIndex];
  const enemyName = stageBoss ? bossNames[regionIndex] : enemies[enemyProfile.variantIndex % enemies.length];
  const xpToNext = Math.round(80 * Math.pow(1.18, state.level - 1));
  const overdriveDamage = Math.round(damage * (4.6 + state.skills.pressure * 0.28));
  const powerScore = Math.round(maxHp * 0.32 + damage * 6.6 + defense * 10 + state.relics * 32 + state.highestStage * 2);

  return {
    maxHp,
    damage,
    defense,
    critChance,
    goldBonus,
    xpToNext,
    enemyName,
    enemyMaxHp,
    enemyDamage,
    enemyTraitLabel: enemyProfile.label,
    enemyTraitDetail: enemyProfile.detail,
    enemyVariantIndex: enemyProfile.variantIndex,
    stageBoss,
    regionName: regionNames[regionIndex],
    regionIndex,
    nextBossStage: Math.min(maxStage, Math.ceil(stage / bossInterval) * bossInterval),
    stageCap: maxStage,
    overdriveDamage,
    bountyMultiplier,
    rewardMultiplier: enemyProfile.rewardMultiplier,
    overdriveChargeMultiplier: enemyProfile.overdriveChargeMultiplier,
    powerScore
  };
}

export function deriveBattleForecast(state: GameState): BattleForecast {
  const stats = deriveStats(state);
  const clearSeconds = getEstimatedClearSeconds(state, stats);
  const clearsPerMinute = 60 / clearSeconds;
  const goldPerClear = getGoldRewardForStage(state, stats);
  const xpPerClear = getXpRewardForStage(state, stats);

  return {
    clearSeconds,
    goldPerMinute: Math.round(goldPerClear * clearsPerMinute),
    xpPerMinute: Math.round(xpPerClear * clearsPerMinute),
    offlineCapHours: 8,
    stageRequirement: Math.max(0, stats.enemyMaxHp - Math.round(stats.damage * 30))
  };
}

export function deriveCombatFeedback(state: GameState): CombatFeedback {
  const stats = deriveStats(state);
  const hitDamage = Math.round(stats.damage * 1.35 * (1 + state.skills.cleave * 0.03));
  const critDamage = Math.round(hitDamage * 1.85);
  const incomingDamage = Math.max(1, Math.round((stats.enemyDamage - stats.defense) * 0.75));
  const threatRatio = incomingDamage / Math.max(1, stats.maxHp);

  return {
    hitDamage,
    critDamage,
    burstDamage: stats.overdriveDamage,
    incomingDamage,
    threatLabel: threatRatio >= 0.09 ? "Danger" : threatRatio >= 0.045 ? "Guarded" : "Stable"
  };
}

export function deriveRewardPreview(state: GameState): RewardPreview {
  const stats = deriveStats(state);
  const parts = getPartsRewardForStage(state, stats);
  const essence = getEssenceRewardForStage(stats);
  const relics = getRelicRewardForStage(stats);
  const nextNormalDropIn = 5 - (state.kills % 5);

  return {
    gold: getGoldRewardForStage(state, stats),
    xp: getXpRewardForStage(state, stats),
    parts,
    essence,
    relics,
    dropLabel: stats.stageBoss ? "Guaranteed gear" : `Gear in ${nextNormalDropIn}`
  };
}

export function deriveLatestDrop(state: GameState): EquipmentItem | undefined {
  return state.inventory.reduce<EquipmentItem | undefined>((latest, item) => {
    if (!latest) {
      return item;
    }
    if (item.droppedAtStage !== latest.droppedAtStage) {
      return item.droppedAtStage > latest.droppedAtStage ? item : latest;
    }
    return item.power > latest.power ? item : latest;
  }, undefined);
}

export function deriveRunReport(state: GameState): RunReport {
  const contracts = deriveContracts(state);
  const bossesTotal = Math.floor(maxStage / bossInterval);
  const bossesCleared = Math.min(bossesTotal, state.bossesDefeated);
  const nextContract = contracts.find((contract) => !contract.claimed);
  const nextAction = getNextRunAction(state, contracts);
  const routeProgressPercent = Math.min(100, Math.round((state.highestStage / maxStage) * 100));
  const equippedSlots = equipmentSlots.filter((slot) => state.equipped[slot]).length;
  const equipmentPower = equipmentSlots.reduce((sum, slot) => sum + getEquippedPower(state, slot), 0);
  const rankScore = state.highestStage + state.level * 2 + bossesCleared * 5 + state.relics * 3 + equipmentPower * 0.18;

  return {
    routeProgressPercent,
    bossesCleared,
    bossesTotal,
    readyContracts: contracts.filter((contract) => contract.completed && !contract.claimed).length,
    claimedContracts: contracts.filter((contract) => contract.claimed).length,
    contractTotal: contracts.length,
    equippedSlots,
    equipmentPower,
    nextMilestoneLabel: nextContract?.title ?? (state.campaignCleared ? "Route Complete" : "Final Route"),
    nextMilestoneProgress: nextContract ? Math.min(nextContract.progress, nextContract.target) : bossesCleared,
    nextMilestoneTarget: nextContract?.target ?? bossesTotal,
    nextActionLabel: nextAction.label,
    nextActionDetail: nextAction.detail,
    nextActionReady: nextAction.ready,
    pressureRank:
      rankScore >= 190 ? "Clockwork Legend" : rankScore >= 110 ? "Vanguard" : rankScore >= 45 ? "Operator" : "Rookie"
  };
}

export function deriveAchievements(state: GameState): Achievement[] {
  const contractsClaimed = new Set(state.claimedContracts ?? []).size;
  const equippedPower = equipmentSlots.reduce((sum, slot) => sum + getEquippedPower(state, slot), 0);
  const skillRanks = skillSlots.reduce((sum, key) => sum + Math.min(maxSkillRank, state.skills[key] ?? 0), 0);
  const bossesTotal = Math.floor(maxStage / bossInterval);
  const bossesCleared = Math.min(bossesTotal, state.bossesDefeated);

  return [
    createAchievement("first-seal", "First Seal", "Reach the first boss route.", state.highestStage, 10),
    createAchievement("dockbreaker", "Dockbreaker", "Defeat three boss engines.", bossesCleared, 3),
    createAchievement("city-cartographer", "City Cartographer", "Chart half of the city route.", state.highestStage, 60),
    createAchievement("ledger-master", "Ledger Master", "Claim six guild contracts.", contractsClaimed, 6),
    createAchievement("gearwright", "Gearwright", "Build 250 equipped gear power.", equippedPower, 250),
    createAchievement("talent-engineer", "Talent Engineer", "Invest ten total skill ranks.", skillRanks, 10),
    createAchievement(
      "quiet-shift",
      "Quiet Shift",
      "Return after at least one offline reward.",
      state.lastOfflineReward && state.lastOfflineReward.seconds >= 300 ? 1 : 0,
      1
    ),
    createAchievement(
      "clockwork-legend",
      "Clockwork Legend",
      "Clear the final Void Foundry route.",
      state.campaignCleared || state.highestStage >= maxStage ? 1 : 0,
      1
    )
  ];
}

export function deriveChallengeTrials(state: GameState): ChallengeTrial[] {
  const stats = deriveStats(state);
  return challengeTrials.map((trial, index) => {
    const routeReady = state.highestStage >= trial.requiredStage;
    const powerReady = stats.powerScore >= trial.requiredPower;
    return {
      ...trial,
      regionName: regionNames[Math.min(regionNames.length - 1, index * 2)],
      currentPower: stats.powerScore,
      ready: routeReady && powerReady,
      cleared:
        (trial.requiredStage >= maxStage && state.campaignCleared) ||
        (routeReady && powerReady && state.bossesDefeated >= Math.floor(trial.requiredStage / bossInterval)),
      rewardLabel: trial.rewardLabel,
      detail: trial.detail
    };
  });
}

function createAchievement(id: string, title: string, detail: string, progress: number, target: number): Achievement {
  const normalizedProgress = Math.max(0, Math.floor(Number.isFinite(progress) ? progress : 0));
  return {
    id,
    title,
    detail,
    progress: Math.min(target, normalizedProgress),
    target,
    unlocked: normalizedProgress >= target
  };
}

export function deriveUpgradePreview(state: GameState, kind: "gear", key: GearKey): UpgradePreview;
export function deriveUpgradePreview(state: GameState, kind: "skill", key: SkillKey): UpgradePreview;
export function deriveUpgradePreview(state: GameState, kind: "gear" | "skill", key: GearKey | SkillKey): UpgradePreview {
  const before = deriveStats(state);
  const next = cloneState(state);
  if (kind === "gear") {
    next.gear[key as GearKey] += 1;
  } else if (state.skills[key as SkillKey] >= maxSkillRank) {
    return {
      powerGain: 0,
      effectLabel: "Max rank"
    };
  } else {
    next.skills[key as SkillKey] += 1;
  }
  const after = deriveStats(next);
  return {
    powerGain: Math.max(0, after.powerScore - before.powerScore),
    effectLabel: getUpgradeEffectLabel(kind, key, before, after)
  };
}

function getUpgradeEffectLabel(
  kind: "gear" | "skill",
  key: GearKey | SkillKey,
  before: DerivedStats,
  after: DerivedStats
) {
  if (key === "armor" || key === "bulwark") {
    return `HP +${Math.max(0, after.maxHp - before.maxHp)}`;
  }
  if (key === "banner" || key === "treasury" || key === "salvage") {
    return `Gold +${Math.max(0, Math.round((after.goldBonus - before.goldBonus) * 100))}%`;
  }
  if (key === "goggles" || key === "cleave") {
    return `Crit +${Math.max(0, Math.round((after.critChance - before.critChance) * 100))}%`;
  }
  if (key === "pressure") {
    return `Burst +${Math.max(0, after.overdriveDamage - before.overdriveDamage)}`;
  }
  if (key === "engine") {
    return `Burst +${Math.max(0, after.overdriveDamage - before.overdriveDamage)}`;
  }
  return `Damage +${Math.max(0, after.damage - before.damage)}`;
}

function getNextRunAction(state: GameState, contracts: ContractProgress[]) {
  const action = getRecommendedRunAction(state, contracts);
  if (!action.ready && (action.kind === "gear" || action.kind === "skill")) {
    return {
      label: `Save for ${action.label.replace(/^(Upgrade|Train) /, "")}`,
      detail: action.detail,
      ready: false
    };
  }
  return {
    label: action.label,
    detail: action.detail,
    ready: action.ready
  };
}

function getRecommendedRunAction(state: GameState, contracts = deriveContracts(state)): RecommendedRunAction {
  const readyContract = contracts.find((contract) => contract.completed && !contract.claimed);
  if (readyContract) {
    return {
      kind: "claim-goals",
      label: "Claim Goals",
      detail: `${readyContract.title} · ${formatRunReward(readyContract.reward)}`,
      ready: true,
      level: 0,
      shortageScore: 0
    };
  }

  const gearCandidates = equipmentSlots.map((key) => {
    const goldCost = getGearCost(state, key);
    const partCost = getGearPartCost(state, key);
    const goldShort = Math.max(0, goldCost - state.gold);
    const partsShort = Math.max(0, partCost - state.parts);
    return {
      kind: "gear" as const,
      key,
      label: `Upgrade ${gearLabels[key]}`,
      detail: formatRunCost(goldCost, "gold", partCost, "parts"),
      ready: goldShort === 0 && partsShort === 0,
      level: state.gear[key],
      shortageScore: goldShort + partsShort * 45
    };
  });

  const skillCandidates = skillSlots.filter((key) => state.skills[key] < maxSkillRank).map((key) => {
    const relicCost = getSkillCost(state, key);
    const essenceCost = getSkillEssenceCost(state, key);
    const talentShort = Math.max(0, 1 - state.levelPoints);
    const relicShort = Math.max(0, relicCost - state.relics);
    const essenceShort = Math.max(0, essenceCost - state.essence);
    return {
      kind: "skill" as const,
      key,
      label: `Train ${skillLabels[key]}`,
      detail: `${formatRunCost(relicCost, "relics", essenceCost, "essence")} · 1 talent`,
      ready: relicShort === 0 && essenceShort === 0 && talentShort === 0,
      level: state.skills[key],
      shortageScore: relicShort * 180 + essenceShort * 75 + talentShort * 120
    };
  });

  const craftingPreview = deriveCraftingPreview(state);
  const craftCandidate = {
    kind: "craft" as const,
    label: "Craft Gear",
    detail: `${craftingPreview.itemName} · ${formatRunCost(craftingPreview.partsCost, "parts", craftingPreview.essenceCost, "essence")}`,
    ready: craftingPreview.available,
    level: getBestSlotPower(state, craftingPreview.slot),
    shortageScore:
      Math.max(0, craftingPreview.partsCost - state.parts) * 38 + Math.max(0, craftingPreview.essenceCost - state.essence) * 95
  };

  const candidate = [...gearCandidates, craftCandidate, ...skillCandidates].sort(
    (left, right) =>
      Number(right.ready) - Number(left.ready) ||
      left.level - right.level ||
      left.shortageScore - right.shortageScore
  )[0];

  if (candidate) {
    return candidate;
  }

  return {
    kind: state.campaignCleared ? "complete" : "wait",
    label: state.campaignCleared ? "Route Complete" : "Push Route",
    detail: `${state.highestStage}/${maxStage} stages charted`,
    ready: state.campaignCleared,
    level: 0,
    shortageScore: Number.POSITIVE_INFINITY
  };
}

export function applyRecommendedRunAction(state: GameState): GameState {
  const action = getRecommendedRunAction(state);
  if (!action.ready) {
    return state;
  }
  if (action.kind === "claim-goals") {
    return claimAllContracts(state);
  }
  if (action.kind === "gear") {
    return buyGear(state, action.key);
  }
  if (action.kind === "skill") {
    return buySkill(state, action.key);
  }
  if (action.kind === "craft") {
    return craftEquipmentItem(state);
  }
  return state;
}

function formatRunCost(primary: number, primaryLabel: string, secondary: number, secondaryLabel: string) {
  if (secondary <= 0) {
    return `${primary} ${primaryLabel}`;
  }
  return `${primary} ${primaryLabel} · ${secondary} ${secondaryLabel}`;
}

function formatRunReward(reward: ContractReward) {
  return [
    reward.gold ? `${reward.gold} gold` : "",
    reward.parts ? `${reward.parts} parts` : "",
    reward.essence ? `${reward.essence} essence` : "",
    reward.relics ? `${reward.relics} relics` : "",
    reward.levelPoints ? `${reward.levelPoints} talent` : ""
  ]
    .filter(Boolean)
    .join(" · ");
}

export function deriveStoryArchive(state: GameState): StoryArchiveEntry[] {
  const openingEntry: StoryArchiveEntry = {
    id: "opening",
    title: openingStory[0].title,
    regionName: "Opening",
    body: openingStory.map((entry) => entry.body).join(" "),
    unlocked: state.introSeen
  };

  const bossEntries = bossNames.map((bossName, regionIndex) => {
    const bossStage = bossInterval + regionIndex * regionSize;
    const bossSequenceId = Math.floor(bossStage / bossInterval);
    const unlocked = (state.seenBossStories ?? []).includes(bossSequenceId) || state.highestStage > bossStage;
    return {
      id: `boss-${bossSequenceId}`,
      title: `${bossName} Defeated`,
      regionName: regionNames[regionIndex],
      body: bossStoryBodies[regionIndex],
      unlocked
    };
  });

  return [
    openingEntry,
    ...bossEntries,
    {
      id: "campaign-ending",
      title: campaignEndingStory.title,
      regionName: "Void Foundry",
      body: campaignEndingStory.body,
      unlocked: state.campaignCleared || (state.seenBossStories ?? []).includes(finalBossStoryId)
    }
  ];
}

export function deriveBestiary(state: GameState): BestiaryEntry[] {
  return regionNames.map((regionName, regionIndex) => ({
    regionName,
    unlocked: state.highestStage >= regionIndex * regionSize + 1,
    enemyNames: [...enemyNamesByRegion[regionIndex]],
    enemyTraits: normalEnemyProfiles.map((profile) => profile.label),
    bossName: bossNames[regionIndex],
    bossMechanic: bossMechanics[regionIndex].label,
    bossDetail: bossMechanics[regionIndex].detail
  }));
}

export function getGearCost(state: GameState, key: GearKey) {
  const premium = key === "engine" ? 1.55 : key === "goggles" ? 1.28 : key === "banner" ? 1.18 : 1;
  return Math.round(42 * Math.pow(1.34, state.gear[key] - 1) * premium);
}

export function getGearPartCost(state: GameState, key: GearKey) {
  if (key === "blade" || key === "armor") {
    return Math.max(0, Math.floor((state.gear[key] - 1) * 1.4));
  }
  return Math.max(0, Math.floor(state.gear[key] * 1.8));
}

export function getSkillCost(state: GameState, key: SkillKey) {
  return getSkillCostForLevel(key, Math.min(maxSkillRank, state.skills[key]));
}

function getSkillCostForLevel(key: SkillKey, level: number) {
  const premium = key === "pressure" || key === "salvage" ? 2 : key === "treasury" ? 1 : 0;
  return Math.round(2 + level * 2 + premium);
}

export function getSkillEssenceCost(state: GameState, key: SkillKey) {
  return getSkillEssenceCostForLevel(key, Math.min(maxSkillRank, state.skills[key]));
}

function getSkillEssenceCostForLevel(key: SkillKey, level: number) {
  if (key === "cleave" || key === "bulwark") {
    return Math.max(0, Math.floor(level / 3));
  }
  return Math.max(0, Math.floor((level + 1) / 2));
}

export function buyGear(state: GameState, key: GearKey): GameState {
  const cost = getGearCost(state, key);
  const partCost = getGearPartCost(state, key);
  if (state.gold < cost || state.parts < partCost) {
    return state;
  }
  const next = cloneState(state);
  next.gold -= cost;
  next.parts -= partCost;
  next.gear[key] += 1;
  const stats = deriveStats(next);
  next.heroHp = Math.min(stats.maxHp, next.heroHp + Math.round(stats.maxHp * 0.18));
  return next;
}

export function deriveForgeAllPreview(state: GameState): ForgeAllPreview {
  let simulation = cloneState(state);
  let totalUpgrades = 0;
  let goldCost = 0;
  let partsCost = 0;
  let nextKey = selectNextAffordableGear(simulation);

  while (nextKey && totalUpgrades < 250) {
    goldCost += getGearCost(simulation, nextKey);
    partsCost += getGearPartCost(simulation, nextKey);
    simulation = buyGear(simulation, nextKey);
    totalUpgrades += 1;
    nextKey = selectNextAffordableGear(simulation);
  }

  const firstKey = selectNextAffordableGear(state);
  const fallbackKey = selectNextGearTarget(state);
  return {
    available: totalUpgrades > 0,
    totalUpgrades,
    goldCost,
    partsCost,
    targetLevels: { ...simulation.gear },
    nextUpgradeLabel: firstKey
      ? gearLabels[firstKey]
      : `${gearLabels[fallbackKey]} needs ${getGearCost(state, fallbackKey)} gold / ${getGearPartCost(state, fallbackKey)} parts`
  };
}

export function forgeAffordableGear(state: GameState): GameState {
  let next = state;
  let key = selectNextAffordableGear(next);
  let upgrades = 0;
  while (key && upgrades < 250) {
    const upgraded = buyGear(next, key);
    if (upgraded === next) {
      break;
    }
    next = upgraded;
    upgrades += 1;
    key = selectNextAffordableGear(next);
  }
  return next;
}

export function deriveCraftingPreview(state: GameState): CraftingPreview {
  const slot = selectCraftingSlot(state);
  const rarity = selectCraftingRarity(state);
  const partsCost = getCraftingPartCost(state);
  const essenceCost = getCraftingEssenceCost(state);
  const itemPower = getCraftingPower(state, slot, rarity);
  return {
    available: state.parts >= partsCost && state.essence >= essenceCost,
    slot,
    rarity,
    partsCost,
    essenceCost,
    itemPower,
    itemName: `Crafted ${rarityLabels[rarity]} ${gearLabels[slot]}`
  };
}

export function craftEquipmentItem(state: GameState): GameState {
  const preview = deriveCraftingPreview(state);
  if (!preview.available) {
    return state;
  }

  const next = cloneState(state);
  next.parts -= preview.partsCost;
  next.essence -= preview.essenceCost;
  insertEquipmentItem(next, {
    id: `crafted-${preview.slot}-${preview.rarity}-${state.highestStage}-${state.kills}-${state.inventory.length}-${Date.now()}`,
    slot: preview.slot,
    rarity: preview.rarity,
    level: Math.max(1, state.highestStage),
    power: preview.itemPower,
    name: preview.itemName,
    droppedAtStage: Math.max(1, state.highestStage)
  });
  recordRunLog(next, {
    kind: "loot",
    title: "Gear crafted",
    detail: preview.itemName,
    stage: next.stage
  });
  return next;
}

function selectCraftingSlot(state: GameState): GearKey {
  return [...equipmentSlots].sort((left, right) => {
    const powerDelta = getBestSlotPower(state, left) - getBestSlotPower(state, right);
    if (powerDelta !== 0) {
      return powerDelta;
    }
    return state.gear[left] - state.gear[right];
  })[0];
}

function selectCraftingRarity(state: GameState): EquipmentRarity {
  if (state.highestStage >= 100) {
    return "legendary";
  }
  if (state.highestStage >= 60) {
    return "epic";
  }
  if (state.highestStage >= 25) {
    return "rare";
  }
  return "uncommon";
}

function getCraftingPartCost(state: GameState) {
  return 55 + getRegionIndex(Math.max(1, state.highestStage)) * 25;
}

function getCraftingEssenceCost(state: GameState) {
  return 1 + Math.floor(Math.max(0, state.highestStage - 1) / 50);
}

function getCraftingPower(state: GameState, slot: GearKey, rarity: EquipmentRarity) {
  const stagePower = Math.max(1, state.highestStage) * 2.05;
  const levelPower = state.level * 1.35;
  const forgePower = state.gear[slot] * 5.5;
  return Math.round((stagePower + levelPower + forgePower + 18) * rarityPower[rarity]);
}

function selectNextAffordableGear(state: GameState): GearKey | null {
  const target = equipmentSlots
    .filter((key) => state.gold >= getGearCost(state, key) && state.parts >= getGearPartCost(state, key))
    .sort((left, right) => {
      const levelDelta = state.gear[left] - state.gear[right];
      if (levelDelta !== 0) {
        return levelDelta;
      }
      const leftCost = getGearCost(state, left) + getGearPartCost(state, left) * 18;
      const rightCost = getGearCost(state, right) + getGearPartCost(state, right) * 18;
      return leftCost - rightCost;
    })[0];
  return target ?? null;
}

function selectNextGearTarget(state: GameState): GearKey {
  return [...equipmentSlots].sort((left, right) => {
    const levelDelta = state.gear[left] - state.gear[right];
    if (levelDelta !== 0) {
      return levelDelta;
    }
    const leftCost = getGearCost(state, left) + getGearPartCost(state, left) * 18;
    const rightCost = getGearCost(state, right) + getGearPartCost(state, right) * 18;
    return leftCost - rightCost;
  })[0];
}

export function buySkill(state: GameState, key: SkillKey): GameState {
  const cost = getSkillCost(state, key);
  const essenceCost = getSkillEssenceCost(state, key);
  if (state.skills[key] >= maxSkillRank || state.relics < cost || state.essence < essenceCost || state.levelPoints < 1) {
    return state;
  }
  const next = cloneState(state);
  next.relics -= cost;
  next.essence -= essenceCost;
  next.skills[key] += 1;
  next.levelPoints -= 1;
  const stats = deriveStats(next);
  next.heroHp = Math.min(stats.maxHp, next.heroHp + Math.round(stats.maxHp * 0.3));
  return next;
}

export function deriveSkillRefund(state: GameState): SkillRefund {
  return skillSlots.reduce(
    (refund, key) => {
      for (let level = 0; level < Math.min(maxSkillRank, state.skills[key]); level += 1) {
        refund.relics += getSkillCostForLevel(key, level);
        refund.essence += getSkillEssenceCostForLevel(key, level);
        refund.levelPoints += 1;
      }
      return refund;
    },
    { relics: 0, essence: 0, levelPoints: 0 }
  );
}

export function respecSkills(state: GameState): GameState {
  const refund = deriveSkillRefund(state);
  if (refund.levelPoints === 0) {
    return state;
  }
  const next = cloneState(state);
  for (const key of skillSlots) {
    next.skills[key] = 0;
  }
  next.relics += refund.relics;
  next.essence += refund.essence;
  next.levelPoints += refund.levelPoints;
  const stats = deriveStats(next);
  next.heroHp = Math.min(stats.maxHp, next.heroHp);
  return next;
}

export function equipItem(state: GameState, itemId: string): GameState {
  const item = state.inventory.find((candidate) => candidate.id === itemId);
  if (!item) {
    return state;
  }

  const next = cloneState(state);
  next.equipped[item.slot] = item.id;
  const stats = deriveStats(next);
  next.heroHp = Math.min(stats.maxHp, next.heroHp + Math.round(stats.maxHp * 0.12));
  return next;
}

export function equipBestItems(state: GameState): GameState {
  const next = cloneState(state);
  let changed = false;

  for (const slot of equipmentSlots) {
    const best = next.inventory
      .filter((item) => item.slot === slot)
      .sort((left, right) => right.power - left.power || right.level - left.level)[0];
    if (best && next.equipped[slot] !== best.id) {
      next.equipped[slot] = best.id;
      changed = true;
    }
  }

  if (!changed) {
    return state;
  }

  const stats = deriveStats(next);
  next.heroHp = Math.min(stats.maxHp, next.heroHp + Math.round(stats.maxHp * 0.18));
  return next;
}

export function sellItem(state: GameState, itemId: string): GameState {
  const item = state.inventory.find((candidate) => candidate.id === itemId);
  if (!item || item.locked) {
    return state;
  }

  const next = cloneState(state);
  next.inventory = next.inventory.filter((candidate) => candidate.id !== itemId);
  if (next.equipped[item.slot] === itemId) {
    next.equipped[item.slot] = null;
  }
  const sellValue = getEquipmentSellValue(item);
  next.gold += sellValue;
  next.parts += getEquipmentPartValue(item);
  return next;
}

export function toggleEquipmentLock(state: GameState, itemId: string): GameState {
  const item = state.inventory.find((candidate) => candidate.id === itemId);
  if (!item) {
    return state;
  }

  const next = cloneState(state);
  next.inventory = next.inventory.map((candidate) =>
    candidate.id === itemId ? { ...candidate, locked: !candidate.locked } : candidate
  );
  return next;
}

export function sellUnequippedByRarity(state: GameState, rarity: EquipmentRarity): GameState {
  const equippedIds = new Set(Object.values(state.equipped).filter(Boolean));
  const sellable = state.inventory.filter((item) => item.rarity === rarity && !item.locked && !equippedIds.has(item.id));
  if (sellable.length === 0) {
    return state;
  }

  const next = cloneState(state);
  const sellableIds = new Set(sellable.map((item) => item.id));
  next.inventory = next.inventory.filter((item) => !sellableIds.has(item.id));
  next.gold += sellable.reduce((sum, item) => sum + getEquipmentSellValue(item), 0);
  next.parts += sellable.reduce((sum, item) => sum + getEquipmentPartValue(item), 0);
  return next;
}

export function toggleAutoSellRarity(state: GameState, rarity: EquipmentRarity): GameState {
  if (!autoSellRarityOptions.includes(rarity)) {
    return state;
  }
  const next = cloneState(state);
  const current = new Set(next.autoSellRarities);
  if (current.has(rarity)) {
    current.delete(rarity);
  } else {
    current.add(rarity);
  }
  next.autoSellRarities = autoSellRarityOptions.filter((option) => current.has(option));
  return next;
}

export function deriveContracts(state: GameState): ContractProgress[] {
  return guildContracts.map((contract) => {
    const progress = getContractProgress(state, contract.metric);
    return {
      ...contract,
      progress,
      completed: progress >= contract.target,
      claimed: (state.claimedContracts ?? []).includes(contract.id)
    };
  });
}

export function claimContract(state: GameState, contractId: string): GameState {
  const contract = deriveContracts(state).find((candidate) => candidate.id === contractId);
  if (!contract || !contract.completed || contract.claimed) {
    return state;
  }

  const next = cloneState(state);
  next.claimedContracts = [...next.claimedContracts, contract.id];
  applyContractReward(next, contract.reward);
  recordRunLog(next, {
    kind: "contract",
    title: "Goal claimed",
    detail: contract.title,
    stage: next.stage
  });
  const stats = deriveStats(next);
  next.heroHp = Math.min(stats.maxHp, next.heroHp + Math.round(stats.maxHp * 0.16));
  return next;
}

export function claimAllContracts(state: GameState): GameState {
  return deriveContracts(state).reduce((next, contract) => {
    if (!contract.completed || contract.claimed) {
      return next;
    }
    return claimContract(next, contract.id);
  }, state);
}

export function deriveReforgePreview(state: GameState): ReforgePreview {
  const earnedRelics = getReforgeRelics(state);
  const nextRelics = state.relics + earnedRelics;
  return {
    available: state.stage >= 30,
    earnedRelics,
    retainedParts: Math.floor(state.parts * 0.25),
    retainedSkillRanks: skillSlots.reduce((sum, key) => sum + Math.min(maxSkillRank, state.skills[key] ?? 0), 0),
    retainedEquipment: Math.min(20, state.inventory.length),
    nextRelicDamageBonusPercent: Math.round(nextRelics * 4)
  };
}

export function ascend(state: GameState): GameState {
  if (state.stage < 30) {
    return state;
  }

  const earnedRelics = getReforgeRelics(state);
  const next = createInitialGameState(Date.now());
  next.heroName = state.heroName;
  next.relics = state.relics + earnedRelics;
  next.parts = Math.floor(state.parts * 0.25);
  next.essence = state.essence;
  next.skills = { ...state.skills };
  next.inventory = state.inventory.slice(0, 20).map((item) => ({ ...item }));
  next.equipped = { ...state.equipped };
  next.totalGold = state.totalGold;
  next.bossesDefeated = state.bossesDefeated;
  next.highestStage = state.highestStage;
  next.claimedContracts = [...(state.claimedContracts ?? [])];
  next.introSeen = state.introSeen;
  next.seenBossStories = [...state.seenBossStories];
  next.campaignCleared = state.campaignCleared;
  next.battlePlan = state.battlePlan ?? "push";
  next.runLog = [...(state.runLog ?? [])];
  next.lastOfflineReward = {
    seconds: 0,
    gold: 0,
    xp: 0,
    parts: 0,
    essence: 0,
    stages: 0,
    capped: false
  };
  recordRunLog(next, {
    kind: "reforge",
    title: "Route reforged",
    detail: `Recovered ${earnedRelics} relics and kept core build memory`,
    stage: state.stage
  });
  return next;
}

function getReforgeRelics(state: GameState) {
  return Math.max(3, Math.floor(state.stage / 8) + Math.floor(state.level / 7) + Math.floor(state.highestStage / 20));
}

export function setBattlePlan(state: GameState, battlePlan: BattlePlan): GameState {
  const next = cloneState(state);
  next.battlePlan = battlePlan;
  if (battlePlan === "farm" && deriveStats(next).stageBoss) {
    next.stage = Math.max(1, next.stage - 1);
    next.zone = Math.floor((next.stage - 1) / 10) + 1;
    next.enemyHp = deriveStats(next).enemyMaxHp;
  }
  return next;
}

export function travelToStage(state: GameState, targetStage: number): GameState {
  const next = cloneState(state);
  const unlockedStage = Math.max(1, Math.min(maxStage, next.highestStage));
  const requestedStage = Number.isFinite(targetStage) ? Math.floor(targetStage) : next.stage;
  next.stage = Math.max(1, Math.min(unlockedStage, requestedStage));
  next.zone = Math.floor((next.stage - 1) / bossInterval) + 1;

  if (next.battlePlan === "farm" && deriveStats(next).stageBoss) {
    next.stage = Math.max(1, next.stage - 1);
    next.zone = Math.floor((next.stage - 1) / bossInterval) + 1;
  }

  next.enemySeed += 1;
  const stats = deriveStats(next);
  next.heroHp = stats.maxHp;
  next.enemyHp = stats.enemyMaxHp;
  next.overdrive = Math.max(0, Math.min(100, next.overdrive));
  recordRunLog(next, {
    kind: "travel",
    title: `Traveled to ${stats.regionName}`,
    detail: `Stage ${next.stage} encounter reset`,
    stage: next.stage
  });
  return next;
}

export function retryCurrentStage(state: GameState): GameState {
  const next = cloneState(state);
  const stats = deriveStats(next);
  next.heroHp = stats.maxHp;
  next.enemyHp = stats.enemyMaxHp;
  next.enemySeed += 1;
  next.overdrive = Math.max(0, Math.min(100, next.overdrive));
  return next;
}

export function tick(state: GameState, elapsedMs: number, now = Date.now()): GameState {
  const next = cloneState(state);
  if (next.battlePlan === "hold") {
    next.lastSavedAt = now;
    return next;
  }

  let remaining = Math.min(elapsedMs, 2500);

  while (remaining > 0) {
    const step = Math.min(remaining, 250);
    resolveCombatStep(next, step / 1000);
    remaining -= step;
  }

  next.lastSavedAt = now;
  return next;
}

export function applyOfflineProgress(state: GameState, now = Date.now()): GameState {
  const elapsedSeconds = Math.max(0, Math.floor((now - state.lastSavedAt) / 1000));
  if (elapsedSeconds < 30) {
    return state;
  }

  if (state.battlePlan === "hold") {
    const next = cloneState(state);
    const offlineCapSeconds = 8 * 60 * 60;
    const cappedSeconds = Math.min(elapsedSeconds, offlineCapSeconds);
    next.lastSavedAt = now;
    next.lastOfflineReward = {
      seconds: cappedSeconds,
      gold: 0,
      xp: 0,
      parts: 0,
      essence: 0,
      stages: 0,
      capped: elapsedSeconds >= offlineCapSeconds
    };
    return next;
  }

  const offlineCapSeconds = 8 * 60 * 60;
  const cappedSeconds = Math.min(elapsedSeconds, offlineCapSeconds);
  const stats = deriveStats(state);
  const clearSeconds = getEstimatedClearSeconds(state, stats);
  const kills = Math.floor(cappedSeconds / clearSeconds);
  const gold = Math.round(kills * (15 + state.stage * 3.1) * stats.goldBonus * stats.bountyMultiplier * stats.rewardMultiplier * 0.72);
  const xp = Math.round(kills * (16 + state.stage * 2.1) * (0.92 + stats.rewardMultiplier * 0.08) * 0.58);
  const parts = Math.round(kills * (1 + stats.regionIndex * 0.35) * (1 + state.skills.salvage * 0.08) * stats.rewardMultiplier);
  const stages = state.battlePlan === "farm" ? 0 : Math.min(maxStage - state.stage, Math.floor(kills / 8));
  const essence = Math.floor(stages / bossInterval);

  const next = cloneState(state);
  next.gold += gold;
  next.parts += parts;
  next.essence += essence;
  next.totalGold += gold;
  next.xp += xp;
  next.kills += kills;
  next.stage += stages;
  next.zone = Math.floor((next.stage - 1) / 10) + 1;
  next.highestStage = Math.max(next.highestStage, next.stage);
  next.overdrive = Math.min(maxOverdrive, next.overdrive + Math.round((Math.floor(kills / 3) + stages * 6) * stats.overdriveChargeMultiplier));
  next.enemySeed += kills;
  levelUp(next);

  const nextStats = deriveStats(next);
  next.heroHp = Math.max(Math.round(nextStats.maxHp * 0.35), Math.min(nextStats.maxHp, next.heroHp));
  next.enemyHp = nextStats.enemyMaxHp;
  next.lastSavedAt = now;
  next.lastOfflineReward = {
    seconds: cappedSeconds,
    gold,
    xp,
    parts,
    essence,
    stages,
    capped: elapsedSeconds >= offlineCapSeconds
  };
  return next;
}

function resolveCombatStep(state: GameState, seconds: number) {
  const stats = deriveStats(state);
  if (state.overdrive >= maxOverdrive) {
    state.enemyHp -= stats.overdriveDamage;
    state.overdrive = 0;
    state.heroHp = Math.min(stats.maxHp, state.heroHp + Math.round(stats.maxHp * 0.12));
    if (state.enemyHp <= 0) {
      defeatEnemy(state);
    }
    return;
  }

  const critRoll = Math.abs(Math.floor(state.kills * 17 + state.enemySeed * 11 + state.stage * 7 + state.enemyHp)) % 100;
  const crit = critRoll < stats.critChance * 100;
  const cleaveBonus = stats.stageBoss ? 1 : 1 + state.skills.cleave * 0.035;
  const heroDamage = stats.damage * seconds * 1.35 * (crit ? 1.85 : 1) * cleaveBonus;
  state.enemyHp -= heroDamage;

  if (state.enemyHp <= 0) {
    defeatEnemy(state);
    return;
  }

  const incoming = Math.max(1, stats.enemyDamage - stats.defense) * seconds * 0.75;
  state.heroHp -= incoming;
  if (state.heroHp <= 0) {
    state.heroHp = Math.round(stats.maxHp * 0.72);
    state.stage = Math.max(1, state.stage - (stats.stageBoss ? 1 : 0));
    state.zone = Math.floor((state.stage - 1) / 10) + 1;
    state.enemyHp = deriveStats(state).enemyMaxHp;
    state.overdrive = Math.min(maxOverdrive, state.overdrive + Math.round(12 * stats.overdriveChargeMultiplier));
  }
}

function defeatEnemy(state: GameState) {
  const stats = deriveStats(state);
  const gold = getGoldRewardForStage(state, stats);
  const xp = getXpRewardForStage(state, stats);
  const parts = getPartsRewardForStage(state, stats);
  const essence = getEssenceRewardForStage(stats);

  state.gold += gold;
  state.parts += parts;
  state.essence += essence;
  state.totalGold += gold;
  state.xp += xp;
  state.kills += 1;
  state.enemySeed += 1;
  const droppedItem = maybeDropEquipment(state, stats.stageBoss);
  if (droppedItem?.autoSold) {
    recordRunLog(state, {
      kind: "loot",
      title: `${rarityLabels[droppedItem.item.rarity]} gear auto-sold`,
      detail: `+${droppedItem.gold} gold · +${droppedItem.parts} parts`,
      stage: state.stage
    });
  } else if (droppedItem) {
    recordRunLog(state, {
      kind: "loot",
      title: `${rarityLabels[droppedItem.item.rarity]} gear found`,
      detail: `${droppedItem.item.name} · Power ${droppedItem.item.power}`,
      stage: state.stage
    });
  }

  if (stats.stageBoss) {
    state.bossesDefeated += 1;
    state.relics += getRelicRewardForStage(stats);
    state.campaignCleared = state.stage >= maxStage;
    state.pendingBossStory = state.campaignCleared
      ? createCampaignEndingStoryCue(stats.enemyName, stats.regionName)
      : createBossStoryCue(state.bossesDefeated, stats.regionIndex, stats.enemyName, stats.regionName);
    recordRunLog(state, {
      kind: "boss",
      title: `${stats.enemyName} defeated`,
      detail: `${stats.regionName} seal broken`,
      stage: state.stage
    });
    state.stage = Math.min(maxStage, state.stage + 1);
    state.overdrive = Math.min(maxOverdrive, state.overdrive + Math.round((35 + state.skills.salvage * 4) * stats.overdriveChargeMultiplier));
  } else {
    state.overdrive = Math.min(maxOverdrive, state.overdrive + Math.round((8 + state.skills.pressure) * stats.overdriveChargeMultiplier));
    if ((state.battlePlan ?? "push") === "push" && state.kills % 4 === 0) {
      state.stage = Math.min(maxStage, state.stage + 1);
    }
  }

  state.zone = Math.floor((state.stage - 1) / 10) + 1;
  state.highestStage = Math.max(state.highestStage, state.stage);
  levelUp(state);
  const nextStats = deriveStats(state);
  state.heroHp = Math.min(nextStats.maxHp, state.heroHp + Math.round(nextStats.maxHp * 0.08));
  state.enemyHp = nextStats.enemyMaxHp;
}

function getEstimatedClearSeconds(state: GameState, stats = deriveStats(state)) {
  const cleavePace = stats.stageBoss ? 1 : 1 + state.skills.cleave * 0.03;
  const effectiveDps = stats.damage * 1.35 * (1 + stats.critChance * 0.85) * cleavePace;
  return Math.max(3, stats.enemyMaxHp / Math.max(1, effectiveDps) + 2.5);
}

function getGoldRewardForStage(state: GameState, stats = deriveStats(state)) {
  return Math.round((18 + state.stage * 3.4) * stats.goldBonus * stats.bountyMultiplier * stats.rewardMultiplier * (stats.stageBoss ? 4.5 : 1));
}

function getXpRewardForStage(state: GameState, stats = deriveStats(state)) {
  return Math.round((20 + state.stage * 2.35) * (0.92 + stats.rewardMultiplier * 0.08) * (stats.stageBoss ? 3 : 1));
}

function getPartsRewardForStage(state: GameState, stats = deriveStats(state)) {
  return Math.round((stats.stageBoss ? 8 : 1 + stats.regionIndex) * (1 + state.skills.salvage * 0.1) * stats.rewardMultiplier);
}

function getEssenceRewardForStage(stats: DerivedStats) {
  if (!stats.stageBoss) {
    return 0;
  }
  const base = 1 + Math.floor(stats.regionIndex / 2);
  return Math.max(1, Math.round(base * (1 + (stats.rewardMultiplier - 1) * 0.45)));
}

function getRelicRewardForStage(stats: DerivedStats) {
  if (!stats.stageBoss) {
    return 0;
  }
  const base = 1 + Math.floor(stats.regionIndex / 2);
  return Math.max(1, Math.round(base * (1 + (stats.rewardMultiplier - 1) * 0.35)));
}

function getEquipmentSellValue(item: EquipmentItem) {
  return Math.round((12 + item.level * 3) * rarityPower[item.rarity]);
}

function getEquipmentPartValue(item: EquipmentItem) {
  return Math.max(1, Math.floor(item.power / 4));
}

function maybeDropEquipment(state: GameState, bossKill: boolean) {
  const shouldDrop = bossKill || state.kills % 5 === 0;
  if (!shouldDrop) {
    return undefined;
  }

  const item = createEquipmentDrop(state, bossKill);
  if (shouldAutoSellDrop(state, item)) {
    const gold = getEquipmentSellValue(item);
    const parts = getEquipmentPartValue(item);
    state.gold += gold;
    state.parts += parts;
    return { item, autoSold: true, gold, parts };
  }

  insertEquipmentItem(state, item);
  return { item, autoSold: false, gold: 0, parts: 0 };
}

function insertEquipmentItem(state: GameState, item: EquipmentItem) {
  const existingIndex = state.inventory.findIndex((candidate) => candidate.id === item.id);
  if (existingIndex >= 0) {
    state.inventory.splice(existingIndex, 1, item);
  } else {
    state.inventory.unshift(item);
  }
  state.inventory = state.inventory
    .sort((left, right) => right.power - left.power || right.level - left.level)
    .slice(0, 24);
}

function createEquipmentDrop(state: GameState, bossKill: boolean): EquipmentItem {
  const slots: GearKey[] = ["blade", "armor", "banner", "goggles", "engine"];
  const seed = Math.abs(state.stage * 31 + state.kills * 17 + state.enemySeed * 13 + (bossKill ? 101 : 0));
  const slot = slots[seed % slots.length];
  const rarity = pickRarity(seed, bossKill);
  const level = Math.max(1, state.stage + Math.floor(seed % 4));
  const power = Math.round((level * 1.8 + state.level * 1.1 + (seed % 9)) * rarityPower[rarity]);
  return {
    id: `${slot}-${rarity}-${state.stage}-${state.kills}-${seed % 997}`,
    slot,
    rarity,
    level,
    power,
    name: `${rarityLabels[rarity]} ${gearLabels[slot]}`,
    droppedAtStage: state.stage
  };
}

function shouldAutoSellDrop(state: GameState, item: EquipmentItem) {
  if (!autoSellRarityOptions.includes(item.rarity) || !(state.autoSellRarities ?? []).includes(item.rarity)) {
    return false;
  }
  return getBestSlotPower(state, item.slot) >= item.power;
}

function getBestSlotPower(state: GameState, slot: GearKey) {
  return state.inventory
    .filter((item) => item.slot === slot)
    .reduce((best, item) => Math.max(best, item.power), getEquippedPower(state, slot));
}

function pickRarity(seed: number, bossKill: boolean): EquipmentRarity {
  const roll = (seed * 37) % 100;
  if (bossKill && roll >= 72) {
    return "legendary";
  }
  if (roll >= 88) {
    return "epic";
  }
  if (roll >= 68) {
    return "rare";
  }
  if (roll >= 34) {
    return "uncommon";
  }
  return "common";
}

function getEquippedPower(state: GameState, slot: GearKey) {
  const itemId = state.equipped?.[slot];
  if (!itemId) {
    return 0;
  }
  return state.inventory.find((item) => item.id === itemId)?.power ?? 0;
}

function getRegionIndex(stage: number) {
  return Math.min(regionNames.length - 1, Math.floor((stage - 1) / regionSize));
}

function getContractProgress(state: GameState, metric: ContractMetric) {
  if (metric === "stage") {
    return state.highestStage;
  }
  if (metric === "kills") {
    return state.kills;
  }
  if (metric === "bosses") {
    return state.bossesDefeated;
  }
  if (metric === "level") {
    return state.level;
  }
  return state.inventory.length + Object.values(state.equipped).filter(Boolean).length;
}

function applyContractReward(state: GameState, reward: ContractReward) {
  state.gold += reward.gold ?? 0;
  state.totalGold += reward.gold ?? 0;
  state.parts += reward.parts ?? 0;
  state.essence += reward.essence ?? 0;
  state.relics += reward.relics ?? 0;
  state.levelPoints += reward.levelPoints ?? 0;
}

function recordRunLog(
  state: GameState,
  entry: {
    kind: RunLogKind;
    title: string;
    detail: string;
    stage: number;
    at?: number;
  }
) {
  const at = entry.at ?? Date.now();
  const existing = state.runLog ?? [];
  const nextEntry: RunLogEntry = {
    id: `${at}-${entry.kind}-${entry.stage}-${existing.length}`,
    kind: entry.kind,
    title: sanitizeRunLogText(entry.title, 72),
    detail: sanitizeRunLogText(entry.detail, 120),
    stage: Math.max(1, Math.min(maxStage, Math.floor(entry.stage))),
    at
  };
  state.runLog = [nextEntry, ...existing].slice(0, maxRunLogEntries);
}

function sanitizeRunLogText(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function levelUp(state: GameState) {
  let stats = deriveStats(state);
  while (state.xp >= stats.xpToNext) {
    state.xp -= stats.xpToNext;
    state.level += 1;
    state.levelPoints += 1;
    state.gold += Math.round(25 + state.level * 8);
    state.parts += Math.floor(1 + state.level / 5);
    stats = deriveStats(state);
    state.heroHp = stats.maxHp;
  }
}

export function markIntroSeen(state: GameState): GameState {
  return {
    ...cloneState(state),
    introSeen: true
  };
}

export function acknowledgeBossStory(state: GameState, storyId: number): GameState {
  const next = cloneState(state);
  next.pendingBossStory = undefined;
  next.seenBossStories = Array.from(new Set([...next.seenBossStories, storyId]));
  return next;
}

function createBossStoryCue(id: number, regionIndex: number, bossName: string, regionName: string): BossStoryCue {
  const body = bossStoryBodies[Math.min(bossStoryBodies.length - 1, Math.max(0, regionIndex))];
  return {
    id,
    bossName,
    regionName,
    title: `${bossName} Defeated`,
    body
  };
}

function createCampaignEndingStoryCue(bossName: string, regionName: string): BossStoryCue {
  return {
    id: finalBossStoryId,
    bossName,
    regionName,
    title: campaignEndingStory.title,
    body: campaignEndingStory.body
  };
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    levelPoints: state.levelPoints ?? 0,
    parts: state.parts ?? 0,
    essence: state.essence ?? 0,
    claimedContracts: [...(state.claimedContracts ?? [])],
    highestStage: Math.max(state.highestStage ?? state.stage, state.stage),
    overdrive: state.overdrive ?? 0,
    introSeen: state.introSeen ?? false,
    seenBossStories: [...(state.seenBossStories ?? [])],
    campaignCleared:
      state.campaignCleared === true ||
      (state.seenBossStories ?? []).includes(finalBossStoryId) ||
      (state.bossesDefeated ?? 0) >= finalBossStoryId,
    battlePlan: state.battlePlan === "farm" ? "farm" : state.battlePlan === "hold" ? "hold" : "push",
    runLog: normalizeRunLog(state.runLog),
    pendingBossStory: state.pendingBossStory ? { ...state.pendingBossStory } : undefined,
    gear: {
      blade: state.gear.blade ?? 1,
      armor: state.gear.armor ?? 1,
      banner: state.gear.banner ?? 1,
      goggles: state.gear.goggles ?? 1,
      engine: state.gear.engine ?? 1
    },
    skills: {
      cleave: state.skills.cleave ?? 0,
      bulwark: state.skills.bulwark ?? 0,
      treasury: state.skills.treasury ?? 0,
      pressure: state.skills.pressure ?? 0,
      salvage: state.skills.salvage ?? 0
    },
    inventory: (state.inventory ?? []).map((item) => ({ ...item })).slice(0, 24),
    equipped: {
      blade: state.equipped?.blade ?? null,
      armor: state.equipped?.armor ?? null,
      banner: state.equipped?.banner ?? null,
      goggles: state.equipped?.goggles ?? null,
      engine: state.equipped?.engine ?? null
    },
    autoSellRarities: autoSellRarityOptions.filter((rarity) => (state.autoSellRarities ?? []).includes(rarity)),
    lastOfflineReward: state.lastOfflineReward
      ? { ...state.lastOfflineReward, capped: state.lastOfflineReward.capped ?? false }
      : undefined
  };
}

function normalizeRunLog(value: unknown): RunLogEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is RunLogEntry => {
      return (
        Boolean(entry) &&
        typeof entry === "object" &&
        ["boss", "contract", "loot", "reforge", "travel"].includes((entry as RunLogEntry).kind) &&
        typeof (entry as RunLogEntry).id === "string" &&
        typeof (entry as RunLogEntry).title === "string" &&
        typeof (entry as RunLogEntry).detail === "string" &&
        Number.isFinite((entry as RunLogEntry).stage) &&
        Number.isFinite((entry as RunLogEntry).at)
      );
    })
    .map((entry) => ({
      id: sanitizeRunLogText(entry.id, 96),
      kind: entry.kind,
      title: sanitizeRunLogText(entry.title, 72),
      detail: sanitizeRunLogText(entry.detail, 120),
      stage: Math.max(1, Math.min(maxStage, Math.floor(entry.stage))),
      at: Math.floor(entry.at)
    }))
    .slice(0, maxRunLogEntries);
}
