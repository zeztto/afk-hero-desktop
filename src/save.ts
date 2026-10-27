import {
  applyOfflineProgress,
  autoSellRarityOptions,
  bossInterval,
  createInitialGameState,
  maxSkillRank,
  maxStage,
  rarityLabels,
  type GameState,
  type GearKey,
  type RunLogEntry
} from "./game";
import type { DisplayMode } from "./types";

const saveKey = "afk-hero-save-v1";
const exportKind = "afk-hero-save-export";
const maxImportedSaveBytes = 512 * 1024;
const gearKeys: GearKey[] = ["blade", "armor", "banner", "goggles", "engine"];
const runLogKinds = ["boss", "contract", "loot", "reforge", "travel"] as const;

type SaveExportEnvelope = {
  kind: typeof exportKind;
  version: 1;
  exportedAt: number;
  checksum: string;
  state: GameState;
};

type NativeStore = {
  load: () => Promise<GameState | null>;
  write: (state: GameState, options?: { recover: boolean }) => Promise<{ ok: boolean }>;
  restoreBackup?: () => Promise<{ ok: boolean; state?: GameState }>;
  reset: () => Promise<{ ok: boolean }>;
};

type DisplayState = {
  isFullScreen: boolean;
  isSimpleFullScreen: boolean;
  isMaximized: boolean;
  isAlwaysOnTop: boolean;
  width: number;
  height: number;
  aspectRatio: number;
};

declare global {
  interface Window {
    afkHeroStore?: NativeStore;
    afkHeroWindow?: {
      setDisplayMode: (mode: DisplayMode) => Promise<{ ok: boolean; mode: DisplayMode; state?: DisplayState }>;
      setAlwaysOnTop: (enabled: boolean) => Promise<{ ok: boolean; state?: DisplayState }>;
      setCompactMode: (enabled: boolean) => Promise<{ ok: boolean; state?: DisplayState }>;
      getDisplayState: () => Promise<{ ok: boolean; state?: DisplayState }>;
    };
    afkHeroLifecycle?: {
      setSavePending: (pending: boolean) => Promise<{ ok: boolean }>;
    };
    afkHeroMenu?: {
      onCommand: (
        callback: (command: "open-settings" | "save-now" | "display-windowed" | "display-borderless" | "display-fullscreen") => void
      ) => () => void;
    };
  }
}

export function loadGameStateFallback(now = Date.now()): GameState {
  const raw = localStorage.getItem(saveKey);
  if (raw === null) return createInitialGameState(now);
  const parsed = parseSaveJson(raw);
  if (!isSupportedSaveState(parsed)) throw new Error("Unsupported saved progress; original preserved");
  return applyOfflineProgress(normalizeGameState(parsed, now), now);
}

export async function loadGameState(now = Date.now()): Promise<GameState> {
  if (!window.afkHeroStore) return loadGameStateFallback(now);
  const stored = await window.afkHeroStore.load();
  if (stored === null) return createInitialGameState(now);
  assertSafeJsonValue(stored, "$");
  if (!isSupportedSaveState(stored)) throw new Error("Unsupported saved progress; original preserved");
  return applyOfflineProgress(normalizeGameState(stored, now), now);
}

export function saveGameStateFallback(state: GameState, options?: { recover: boolean }) {
  const existing = localStorage.getItem(saveKey);
  if (existing !== null) {
    try {
      if (!isSupportedSaveState(parseSaveJson(existing))) throw new Error("Unsupported save");
    } catch {
      if (!options?.recover) throw new Error("Save blocked; unreadable original preserved");
      localStorage.setItem(`${saveKey}-unreadable-${crypto.randomUUID()}`, existing);
    }
  }
  localStorage.setItem(saveKey, JSON.stringify({ ...state, lastSavedAt: Date.now() }));
}

export async function saveGameState(state: GameState, options?: { recover: boolean }) {
  const next = { ...state, lastSavedAt: Date.now() };
  if (window.afkHeroStore) {
    const result = await window.afkHeroStore.write(next, options);
    if (!result.ok) throw new Error("Native save write failed");
    return { ok: true, savedAt: next.lastSavedAt };
  }
  saveGameStateFallback(next, options);
  return { ok: true, savedAt: next.lastSavedAt };
}

export async function resetGameState(now = Date.now()) {
  const resetResult = await window.afkHeroStore?.reset();
  if (resetResult && !resetResult.ok) {
    throw new Error("Native save reset failed");
  }
  const state = createInitialGameState(now);
  await saveGameState(state, { recover: true });
  return state;
}

export async function restoreBackupGameState(now = Date.now()) {
  if (!window.afkHeroStore?.restoreBackup) {
    throw new Error("Native save backup unavailable");
  }
  const result = await window.afkHeroStore.restoreBackup();
  if (!result.ok || !isSupportedSaveState(result.state)) {
    throw new Error("Native save backup restore failed");
  }
  const restored = applyOfflineProgress(normalizeGameState(result.state, now), now);
  await saveGameState(restored, { recover: true });
  return restored;
}

export function serializeGameStateForExport(state: GameState, now = Date.now()) {
  const exportedState = { ...state, lastSavedAt: now };
  const envelope: SaveExportEnvelope = {
    kind: exportKind,
    version: 1,
    exportedAt: now,
    checksum: createSaveChecksum(exportedState),
    state: exportedState
  };
  return JSON.stringify(envelope, null, 2);
}

export function parseImportedGameState(raw: string, now = Date.now()) {
  const parsed = parseSaveJson(raw) as GameState | SaveExportEnvelope;
  const state = isSaveExportEnvelope(parsed) ? parseExportEnvelope(parsed) : parsed;
  if (!isSupportedSaveState(state)) {
    throw new Error("Unsupported save version");
  }
  return applyOfflineProgress(normalizeGameState(state, now), now);
}

export function createSaveChecksum(state: GameState) {
  let hash = 0x811c9dc5;
  const source = stableStringify(state);
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function parseExportEnvelope(envelope: SaveExportEnvelope) {
  if (envelope.version !== 1 || !isSupportedSaveState(envelope.state)) {
    throw new Error("Unsupported save version");
  }
  const expected = createSaveChecksum(envelope.state);
  if (envelope.checksum !== expected) {
    throw new Error("Save checksum mismatch");
  }
  return envelope.state;
}

function isSaveExportEnvelope(value: GameState | SaveExportEnvelope): value is SaveExportEnvelope {
  return Boolean(value && typeof value === "object" && "kind" in value && value.kind === exportKind);
}

function parseSaveJson(raw: string): unknown {
  if (new TextEncoder().encode(raw).byteLength > maxImportedSaveBytes) {
    throw new Error("Save import is too large");
  }
  const parsed = JSON.parse(raw) as unknown;
  assertSafeJsonValue(parsed, "$");
  return parsed;
}

function isSupportedSaveState(value: unknown): value is GameState {
  return isPlainObject(value) && value.version === 1;
}

function assertSafeJsonValue(value: unknown, path: string) {
  if (value === undefined || value === null || typeof value === "string" || typeof value === "boolean") {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Non-finite number at ${path}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertSafeJsonValue(entry, `${path}[${index}]`));
    return;
  }
  if (!isPlainObject(value)) {
    throw new Error(`Invalid JSON value at ${path}`);
  }
  for (const key of Object.keys(value)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      throw new Error(`Unsafe key at ${path}.${key}`);
    }
    assertSafeJsonValue((value as Record<string, unknown>)[key], `${path}.${key}`);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
  return `{${entries.join(",")}}`;
}

function normalizeGameState(state: GameState, now = Date.now()): GameState {
  const initial = createInitialGameState(now);
  const stage = clampInteger(state.stage, 1, maxStage, initial.stage);
  const highestStage = clampInteger(state.highestStage, stage, maxStage, stage);
  const seenBossStories = normalizeSeenBossStories(state.seenBossStories);

  return {
    ...initial,
    ...state,
    heroName: normalizeHeroName(state.heroName, initial.heroName),
    level: clampInteger(state.level, 1, 9999, initial.level),
    xp: clampNonNegativeInteger(state.xp, initial.xp),
    gold: clampNonNegativeInteger(state.gold, initial.gold),
    relics: clampNonNegativeInteger(state.relics, initial.relics),
    kills: clampNonNegativeInteger(state.kills, initial.kills),
    bossesDefeated: clampNonNegativeInteger(state.bossesDefeated, initial.bossesDefeated),
    totalGold: clampNonNegativeInteger(state.totalGold, initial.totalGold),
    heroHp: clampInteger(state.heroHp, 1, Number.MAX_SAFE_INTEGER, initial.heroHp),
    enemyHp: clampInteger(state.enemyHp, 1, Number.MAX_SAFE_INTEGER, initial.enemyHp),
    enemySeed: clampInteger(state.enemySeed, 0, Number.MAX_SAFE_INTEGER, initial.enemySeed),
    stage,
    levelPoints: clampNonNegativeInteger(state.levelPoints, initial.levelPoints),
    parts: clampNonNegativeInteger(state.parts, initial.parts),
    essence: clampNonNegativeInteger(state.essence, initial.essence),
    zone: Math.floor((stage - 1) / 10) + 1,
    highestStage,
    overdrive: clampInteger(state.overdrive, 0, 100, initial.overdrive),
    claimedContracts: normalizeStringArray(state.claimedContracts, 64),
    introSeen: typeof state.introSeen === "boolean" ? state.introSeen : initial.introSeen,
    seenBossStories,
    campaignCleared:
      state.campaignCleared === true ||
      seenBossStories.includes(Math.floor(maxStage / bossInterval)) ||
      (state.bossesDefeated ?? 0) >= Math.floor(maxStage / bossInterval),
    battlePlan: state.battlePlan === "farm" ? "farm" : state.battlePlan === "hold" ? "hold" : "push",
    runLog: normalizeRunLog(state.runLog),
    pendingBossStory: normalizeBossStoryCue(state.pendingBossStory),
    lastOfflineReward: normalizeOfflineReward(state.lastOfflineReward),
    inventory: normalizeInventory(state.inventory),
    equipped: normalizeEquipped(state.equipped, normalizeInventory(state.inventory)),
    autoSellRarities: normalizeAutoSellRarities((state as GameState).autoSellRarities),
    gear: {
      blade: clampInteger(state.gear?.blade, 1, 9999, initial.gear.blade),
      armor: clampInteger(state.gear?.armor, 1, 9999, initial.gear.armor),
      banner: clampInteger(state.gear?.banner, 1, 9999, initial.gear.banner),
      goggles: clampInteger(state.gear?.goggles, 1, 9999, initial.gear.goggles),
      engine: clampInteger(state.gear?.engine, 1, 9999, initial.gear.engine)
    },
    skills: {
      cleave: clampRank(state.skills?.cleave ?? initial.skills.cleave, 0, maxSkillRank),
      bulwark: clampRank(state.skills?.bulwark ?? initial.skills.bulwark, 0, maxSkillRank),
      treasury: clampRank(state.skills?.treasury ?? initial.skills.treasury, 0, maxSkillRank),
      pressure: clampRank(state.skills?.pressure ?? initial.skills.pressure, 0, maxSkillRank),
      salvage: clampRank(state.skills?.salvage ?? initial.skills.salvage, 0, maxSkillRank)
    },
    lastSavedAt: state.lastSavedAt ?? now
  };
}

function normalizeRunLog(value: unknown): RunLogEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is RunLogEntry => {
      const candidate = entry as RunLogEntry;
      return (
        Boolean(candidate) &&
        typeof candidate === "object" &&
        runLogKinds.includes(candidate.kind) &&
        typeof candidate.id === "string" &&
        typeof candidate.title === "string" &&
        typeof candidate.detail === "string" &&
        Number.isFinite(candidate.stage) &&
        Number.isFinite(candidate.at)
      );
    })
    .map((entry) => ({
      id: entry.id.slice(0, 96),
      kind: entry.kind,
      title: entry.title.replace(/\s+/g, " ").trim().slice(0, 72),
      detail: entry.detail.replace(/\s+/g, " ").trim().slice(0, 120),
      stage: Math.max(1, Math.min(maxStage, Math.floor(entry.stage))),
      at: Math.floor(entry.at)
    }))
    .slice(0, 12);
}

function normalizeInventory(value: unknown): GameState["inventory"] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.slice(0, 24).flatMap((item) => {
    const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    if (
      typeof record.id !== "string" ||
      typeof record.name !== "string" ||
      !gearKeys.includes(record.slot as GearKey) ||
      !Object.keys(rarityLabels).includes(String(record.rarity))
    ) {
      return [];
    }
    return {
      id: record.id.slice(0, 96),
      slot: record.slot as GameState["inventory"][number]["slot"],
      rarity: record.rarity as GameState["inventory"][number]["rarity"],
      level: clampInteger(record.level, 1, 9999, 1),
      power: clampInteger(record.power, 1, Number.MAX_SAFE_INTEGER, 1),
      name: record.name.replace(/\s+/g, " ").trim().slice(0, 72) || `${String(record.rarity)} ${String(record.slot)}`,
      droppedAtStage: clampInteger(record.droppedAtStage, 1, maxStage, 1),
      locked: record.locked === true
    };
  }) as GameState["inventory"];
}

function normalizeEquipped(value: unknown, inventory: GameState["inventory"]): GameState["equipped"] {
  const equippedIds = new Set(inventory.map((item) => item.id));
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    blade: normalizeEquippedId(record.blade, equippedIds),
    armor: normalizeEquippedId(record.armor, equippedIds),
    banner: normalizeEquippedId(record.banner, equippedIds),
    goggles: normalizeEquippedId(record.goggles, equippedIds),
    engine: normalizeEquippedId(record.engine, equippedIds)
  };
}

function normalizeEquippedId(value: unknown, validIds: Set<string>) {
  return typeof value === "string" && validIds.has(value) ? value : null;
}

function normalizeAutoSellRarities(value: unknown): GameState["autoSellRarities"] {
  if (!Array.isArray(value)) {
    return [];
  }
  const selected = new Set(value.filter((entry): entry is GameState["autoSellRarities"][number] => autoSellRarityOptions.includes(entry)));
  return autoSellRarityOptions.filter((rarity) => selected.has(rarity));
}

function clampRank(value: unknown, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.floor(value as number)));
}

function normalizeHeroName(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized.slice(0, 40) : fallback;
}

function normalizeStringArray(value: unknown, maxLength: number) {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(new Set(value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)))
    .map((entry) => entry.replace(/\s+/g, " ").trim().slice(0, 96))
    .slice(0, maxLength);
}

function normalizeSeenBossStories(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  const finalBossId = Math.floor(maxStage / bossInterval);
  return Array.from(
    new Set(
      value
        .filter((entry): entry is number => Number.isFinite(entry))
        .map((entry) => Math.floor(entry))
        .filter((entry) => entry >= 1 && entry <= finalBossId)
    )
  );
}

function normalizeBossStoryCue(value: unknown): GameState["pendingBossStory"] {
  if (!isPlainObject(value) || !Number.isFinite(value.id)) {
    return undefined;
  }
  const bossName = normalizeRequiredText(value.bossName, 60);
  const regionName = normalizeRequiredText(value.regionName, 60);
  const title = normalizeRequiredText(value.title, 80);
  const body = normalizeRequiredText(value.body, 240);
  if (!bossName || !regionName || !title || !body) {
    return undefined;
  }
  return {
    id: clampInteger(value.id, 1, Math.floor(maxStage / bossInterval), 1),
    bossName,
    regionName,
    title,
    body
  };
}

function normalizeOfflineReward(value: unknown): GameState["lastOfflineReward"] {
  if (!isPlainObject(value) || typeof value.capped !== "boolean") {
    return undefined;
  }
  return {
    seconds: clampNonNegativeInteger(value.seconds, 0),
    gold: clampNonNegativeInteger(value.gold, 0),
    xp: clampNonNegativeInteger(value.xp, 0),
    parts: clampNonNegativeInteger(value.parts, 0),
    essence: clampNonNegativeInteger(value.essence, 0),
    stages: clampNonNegativeInteger(value.stages, 0),
    capped: value.capped
  };
}

function normalizeRequiredText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function clampNonNegativeInteger(value: unknown, fallback: number) {
  return clampInteger(value, 0, Number.MAX_SAFE_INTEGER, fallback);
}

function clampInteger(value: unknown, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.floor(value as number)));
}
