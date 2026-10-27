const maxSavePayloadBytes = 512 * 1024;
const requiredNumberFields = [
  "level",
  "xp",
  "levelPoints",
  "gold",
  "relics",
  "parts",
  "essence",
  "stage",
  "zone",
  "highestStage",
  "heroHp",
  "enemyHp",
  "enemySeed",
  "overdrive",
  "kills",
  "bossesDefeated",
  "totalGold",
  "lastSavedAt"
];
const gearKeys = ["blade", "armor", "banner", "goggles", "engine"];
const skillKeys = ["cleave", "bulwark", "treasury", "pressure", "salvage"];
const equipmentRarities = ["common", "uncommon", "rare", "epic", "legendary"];
const autoSellRarityOptions = ["common", "uncommon"];
const runLogKinds = ["boss", "contract", "loot", "reforge", "travel"];
const maxSkillRank = 5;

function normalizeSavePayloadForDisk(payload) {
  assertValidSavePayload(payload);
  const serialized = JSON.stringify(payload, null, 2);
  if (Buffer.byteLength(serialized, "utf8") > maxSavePayloadBytes) {
    throw new Error("Save payload too large");
  }
  return serialized;
}

function shouldReplaceBackupSnapshot(primary, backup) {
  if (!isPlainObject(primary) || primary.version !== 1) {
    return false;
  }
  if (!isPlainObject(backup) || backup.version !== 1) {
    return true;
  }
  return getSaveProgressScore(primary) >= getSaveProgressScore(backup);
}

function getSaveProgressScore(payload) {
  return Math.max(
    coerceProgressNumber(payload.highestStage),
    coerceProgressNumber(payload.stage),
    coerceProgressNumber(payload.bossesDefeated) * 10
  );
}

function coerceProgressNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function assertValidSavePayload(payload) {
  if (!isPlainObject(payload)) {
    throw new Error("Save payload must be an object");
  }
  assertSafeJsonValue(payload, "$");

  if (payload.version !== 1) {
    throw new Error("Unsupported save payload version");
  }
  if (typeof payload.heroName !== "string" || payload.heroName.trim().length < 1 || payload.heroName.length > 40) {
    throw new Error("Invalid hero name");
  }
  if (!["push", "farm", "hold"].includes(payload.battlePlan)) {
    throw new Error("Invalid battle plan");
  }
  if (payload.campaignCleared !== undefined && typeof payload.campaignCleared !== "boolean") {
    throw new Error("Invalid campaign cleared state");
  }
  for (const field of requiredNumberFields) {
    assertFiniteNumber(payload[field], field);
  }
  assertKeyedNumbers(payload.gear, gearKeys, "gear");
  assertKeyedNumbers(payload.skills, skillKeys, "skills");
  for (const key of skillKeys) {
    if (payload.skills[key] < 0 || payload.skills[key] > maxSkillRank || !Number.isInteger(payload.skills[key])) {
      throw new Error(`Invalid skills.${key}`);
    }
  }
  assertStringArray(payload.claimedContracts, "claimedContracts", 64);
  assertNumberArray(payload.seenBossStories, "seenBossStories", 24);
  assertRunLog(payload.runLog);

  if (!Array.isArray(payload.inventory) || payload.inventory.length > 24) {
    throw new Error("Invalid inventory");
  }
  for (const item of payload.inventory) {
    assertEquipmentItem(item);
  }
  assertAutoSellRarities(payload.autoSellRarities);

  if (!isPlainObject(payload.equipped)) {
    throw new Error("Invalid equipped state");
  }
  for (const key of gearKeys) {
    const itemId = payload.equipped[key];
    if (itemId !== null && typeof itemId !== "string") {
      throw new Error(`Invalid equipped.${key}`);
    }
  }

  if (payload.pendingBossStory !== undefined) {
    assertBossStory(payload.pendingBossStory);
  }
  if (payload.lastOfflineReward !== undefined) {
    assertOfflineReward(payload.lastOfflineReward);
  }
}

function assertRunLog(value) {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value) || value.length > 12) {
    throw new Error("Invalid run log");
  }
  for (const entry of value) {
    if (!isPlainObject(entry)) {
      throw new Error("Invalid run log entry");
    }
    if (typeof entry.id !== "string" || entry.id.length < 1 || entry.id.length > 96) {
      throw new Error("Invalid run log id");
    }
    if (!runLogKinds.includes(entry.kind)) {
      throw new Error("Invalid run log kind");
    }
    if (typeof entry.title !== "string" || entry.title.length < 1 || entry.title.length > 72) {
      throw new Error("Invalid run log title");
    }
    if (typeof entry.detail !== "string" || entry.detail.length < 1 || entry.detail.length > 120) {
      throw new Error("Invalid run log detail");
    }
    assertFiniteNumber(entry.stage, "runLog.stage");
    assertFiniteNumber(entry.at, "runLog.at");
  }
}

function assertSafeJsonValue(value, path) {
  if (value === undefined) {
    return;
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") {
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
    assertSafeJsonValue(value[key], `${path}.${key}`);
  }
}

function assertEquipmentItem(item) {
  if (!isPlainObject(item)) {
    throw new Error("Invalid equipment item");
  }
  for (const field of ["id", "slot", "rarity", "name"]) {
    if (typeof item[field] !== "string" || item[field].length < 1) {
      throw new Error(`Invalid equipment ${field}`);
    }
  }
  if (!gearKeys.includes(item.slot)) {
    throw new Error("Invalid equipment slot");
  }
  if (!equipmentRarities.includes(item.rarity)) {
    throw new Error("Invalid equipment rarity");
  }
  for (const field of ["level", "power", "droppedAtStage"]) {
    assertFiniteNumber(item[field], `equipment.${field}`);
  }
  if (item.locked !== undefined && typeof item.locked !== "boolean") {
    throw new Error("Invalid equipment locked state");
  }
}

function assertAutoSellRarities(value) {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value) || value.length > autoSellRarityOptions.length) {
    throw new Error("Invalid auto-sell rarities");
  }
  const seen = new Set();
  for (const rarity of value) {
    if (!autoSellRarityOptions.includes(rarity) || seen.has(rarity)) {
      throw new Error("Invalid auto-sell rarities");
    }
    seen.add(rarity);
  }
}

function assertBossStory(story) {
  if (!isPlainObject(story)) {
    throw new Error("Invalid boss story");
  }
  assertFiniteNumber(story.id, "pendingBossStory.id");
  for (const field of ["bossName", "regionName", "title", "body"]) {
    if (typeof story[field] !== "string" || story[field].length < 1) {
      throw new Error(`Invalid pendingBossStory.${field}`);
    }
  }
}

function assertOfflineReward(reward) {
  if (!isPlainObject(reward)) {
    throw new Error("Invalid offline reward");
  }
  for (const field of ["seconds", "gold", "xp", "parts", "essence", "stages"]) {
    assertFiniteNumber(reward[field], `lastOfflineReward.${field}`);
  }
  if (typeof reward.capped !== "boolean") {
    throw new Error("Invalid lastOfflineReward.capped");
  }
}

function assertStringArray(value, name, maxLength) {
  if (!Array.isArray(value) || value.length > maxLength || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`Invalid ${name}`);
  }
}

function assertNumberArray(value, name, maxLength) {
  if (!Array.isArray(value) || value.length > maxLength || value.some((entry) => !Number.isFinite(entry))) {
    throw new Error(`Invalid ${name}`);
  }
}

function assertKeyedNumbers(value, keys, name) {
  if (!isPlainObject(value)) {
    throw new Error(`Invalid ${name}`);
  }
  for (const key of keys) {
    assertFiniteNumber(value[key], `${name}.${key}`);
  }
}

function assertFiniteNumber(value, name) {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid ${name}`);
  }
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

module.exports = {
  maxSavePayloadBytes,
  normalizeSavePayloadForDisk,
  shouldReplaceBackupSnapshot
};
