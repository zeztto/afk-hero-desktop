import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactDir = path.join(rootDir, "qa-artifacts");
const reportPath = path.join(artifactDir, "asset-integrity.json");

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const rgba = 6;
const rgb = 2;

const normalEnemySprites = [
  "src/assets/sprites/afk-hero-enemy.png",
  "src/assets/sprites/generated/enemy-furnace-crawler.png",
  "src/assets/sprites/generated/enemy-aether-drone.png",
  "src/assets/sprites/generated/enemy-censer-guard.png",
  "src/assets/sprites/generated/enemy-scrap-duelist.png",
  "src/assets/sprites/generated/enemy-void-riveter.png"
];

const bossSprites = [
  "src/assets/sprites/afk-hero-boss.png",
  "src/assets/sprites/generated/boss-harbor-gearlord.png",
  "src/assets/sprites/generated/boss-rail-siege-engine.png",
  "src/assets/sprites/generated/boss-cathedral-furnace.png",
  "src/assets/sprites/generated/boss-clocktower-warden.png",
  "src/assets/sprites/generated/boss-foundry-colossus.png"
];

const requiredPngs = [
  {
    role: "app icon source",
    file: "build/icon.png",
    minWidth: 1024,
    minHeight: 1024,
    colorTypes: [rgba]
  },
  {
    role: "battle background",
    file: "src/assets/backgrounds/steamworks-forge.png",
    minWidth: 1280,
    minHeight: 720,
    colorTypes: [rgb, rgba]
  },
  {
    role: "hero sprite",
    file: "src/assets/sprites/afk-hero-steampunk.png",
    minWidth: 512,
    minHeight: 512,
    colorTypes: [rgba]
  },
  {
    role: "attack FX sprite",
    file: "src/assets/sprites/afk-hero-attack-fx.png",
    minWidth: 512,
    minHeight: 512,
    colorTypes: [rgba]
  },
  ...normalEnemySprites.map((file) => ({
    role: "normal enemy sprite",
    file,
    minWidth: 512,
    minHeight: 512,
    colorTypes: [rgba]
  })),
  ...bossSprites.map((file) => ({
    role: "boss sprite",
    file,
    minWidth: 512,
    minHeight: 512,
    colorTypes: [rgba]
  }))
];

const optionalPngs = [
  {
    role: "enemy/boss contact sheet",
    file: "qa-artifacts/generated-enemy-boss-contact-sheet.png",
    minWidth: 1200,
    minHeight: 400,
    colorTypes: [rgb, rgba]
  }
];

function fail(failures, file, message) {
  failures.push({ file, message });
}

async function readPngHeader(relativeFile) {
  const absoluteFile = path.join(rootDir, relativeFile);
  const buffer = await fs.readFile(absoluteFile);
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(pngSignature)) {
    throw new Error("not a PNG file");
  }
  const chunkLength = buffer.readUInt32BE(8);
  const chunkType = buffer.toString("ascii", 12, 16);
  if (chunkLength !== 13 || chunkType !== "IHDR") {
    throw new Error("missing PNG IHDR chunk");
  }
  return {
    file: relativeFile,
    bytes: buffer.length,
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer[24],
    colorType: buffer[25]
  };
}

async function checkPng(spec, failures) {
  try {
    const header = await readPngHeader(spec.file);
    if (header.width < spec.minWidth || header.height < spec.minHeight) {
      fail(failures, spec.file, `${spec.role} is too small: ${header.width}x${header.height}`);
    }
    if (!spec.colorTypes.includes(header.colorType)) {
      fail(failures, spec.file, `${spec.role} has unsupported color type ${header.colorType}`);
    }
    if (header.bitDepth !== 8) {
      fail(failures, spec.file, `${spec.role} must be 8-bit PNG`);
    }
    return { ...header, role: spec.role, ok: true };
  } catch (error) {
    fail(failures, spec.file, `${spec.role} failed PNG validation: ${error.message}`);
    return { file: spec.file, role: spec.role, ok: false, error: error.message };
  }
}

async function checkOptionalPng(spec, failures) {
  try {
    await fs.access(path.join(rootDir, spec.file));
  } catch {
    return { file: spec.file, role: spec.role, ok: true, skipped: true };
  }
  return checkPng(spec, failures);
}

async function checkIcns(failures) {
  const file = "build/icon.icns";
  const absoluteFile = path.join(rootDir, file);
  try {
    const buffer = await fs.readFile(absoluteFile);
    const magic = buffer.toString("ascii", 0, 4);
    if (magic !== "icns") {
      fail(failures, file, "app icon is not an ICNS file");
    }
    if (buffer.length < 100_000) {
      fail(failures, file, "app icon ICNS is unexpectedly small");
    }
    return { file, role: "macOS app icon", bytes: buffer.length, magic, ok: true };
  } catch (error) {
    fail(failures, file, `macOS app icon is missing or unreadable: ${error.message}`);
    return { file, role: "macOS app icon", ok: false, error: error.message };
  }
}

async function checkBuilderIcon(failures) {
  const file = "electron-builder.json";
  try {
    const config = JSON.parse(await fs.readFile(path.join(rootDir, file), "utf8"));
    if (config.icon !== "build/icon.icns") {
      fail(failures, file, `electron-builder icon must be build/icon.icns, got ${String(config.icon)}`);
    }
    return { file, role: "electron-builder icon config", icon: config.icon, ok: config.icon === "build/icon.icns" };
  } catch (error) {
    fail(failures, file, `electron-builder config failed validation: ${error.message}`);
    return { file, role: "electron-builder icon config", ok: false, error: error.message };
  }
}

function checkUniqueGroup(name, files, expected, failures) {
  const uniqueCount = new Set(files).size;
  if (files.length !== expected) {
    fail(failures, name, `${name} must contain ${expected} files, got ${files.length}`);
  }
  if (uniqueCount !== files.length) {
    fail(failures, name, `${name} contains duplicate file paths`);
  }
  return { name, expected, count: files.length, uniqueCount, ok: files.length === expected && uniqueCount === files.length };
}

const failures = [];
const requiredResults = await Promise.all(requiredPngs.map((spec) => checkPng(spec, failures)));
const optionalResults = await Promise.all(optionalPngs.map((spec) => checkOptionalPng(spec, failures)));
const iconResult = await checkIcns(failures);
const builderIconResult = await checkBuilderIcon(failures);
const groups = [
  checkUniqueGroup("normal enemy sprite pool", normalEnemySprites, 6, failures),
  checkUniqueGroup("boss sprite pool", bossSprites, 6, failures)
];

await fs.mkdir(artifactDir, { recursive: true });
const report = {
  ok: failures.length === 0,
  checkedAt: new Date().toISOString(),
  requiredPngs: requiredResults,
  optionalPngs: optionalResults,
  icon: iconResult,
  builderIcon: builderIconResult,
  groups,
  failures
};

await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (!report.ok) {
  console.error(`Asset integrity check failed. Report: ${reportPath}`);
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}

console.log(`Asset integrity check passed: ${requiredResults.length} required PNGs, ${groups.length} sprite groups, macOS icon.`);
console.log(`Report: ${reportPath}`);
