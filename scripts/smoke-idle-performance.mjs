import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { _electron as electron } from "playwright";

const root = process.cwd();
const executablePath = path.join(root, "release", "mac-arm64", "AFK HERO.app", "Contents", "MacOS", "AFK HERO");
const artifactDir = path.join(root, "qa-artifacts");
const userDataDir = path.join(artifactDir, "user-data-idle-performance");
const reportPath = path.join(artifactDir, "idle-performance.json");
const screenshotPath = path.join(artifactDir, "idle-performance.png");
const durationSeconds = clampNumber(Number(process.env.AFK_HERO_IDLE_SMOKE_SECONDS ?? 20), 5, 1800);
const sampleIntervalMs = 1000;
const maxAverageCpuPercent = Number(process.env.AFK_HERO_IDLE_MAX_AVG_CPU_PERCENT ?? 35);
const maxPeakCpuPercent = Number(process.env.AFK_HERO_IDLE_MAX_PEAK_CPU_PERCENT ?? 95);
const maxWorkingSetMb = Number(process.env.AFK_HERO_IDLE_MAX_WORKING_SET_MB ?? 900);

if (!existsSync(executablePath)) {
  throw new Error(`Packaged app not found: ${executablePath}. Run npm run release:mac first.`);
}

await mkdir(artifactDir, { recursive: true });
await resetDirectory(userDataDir);
await writeFile(path.join(userDataDir, "save.json"), JSON.stringify(createIdleSave(), null, 2), "utf8");

const app = await electron.launch({
  executablePath,
  env: {
    ...process.env,
    AFK_HERO_USER_DATA_DIR: userDataDir,
    ELECTRON_ENABLE_LOGGING: "1"
  }
});

try {
  const page = await firstReadyWindow(app);
  await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Low Power" }).click();
  await page.getByRole("button", { name: "Return" }).click();
  await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
  await page.screenshot({ path: screenshotPath, fullPage: false });

  await collectMetrics(app);
  const samples = [];
  const startedAt = Date.now();
  while (Date.now() - startedAt < durationSeconds * 1000) {
    await page.waitForTimeout(sampleIntervalMs);
    samples.push(await collectMetrics(app));
  }

  const cpuTotals = samples.map((sample) => sample.totalCpuPercent);
  const workingSetTotals = samples.map((sample) => sample.totalWorkingSetMb);
  const averageCpuPercent = average(cpuTotals);
  const peakCpuPercent = Math.max(...cpuTotals);
  const peakWorkingSetMb = Math.max(...workingSetTotals);
  const report = {
    ok:
      averageCpuPercent <= maxAverageCpuPercent &&
      peakCpuPercent <= maxPeakCpuPercent &&
      peakWorkingSetMb <= maxWorkingSetMb,
    checkedAt: new Date().toISOString(),
    executablePath,
    userDataDir,
    screenshotPath,
    durationSeconds,
    sampleIntervalMs,
    thresholds: {
      maxAverageCpuPercent,
      maxPeakCpuPercent,
      maxWorkingSetMb
    },
    summary: {
      averageCpuPercent,
      peakCpuPercent,
      peakWorkingSetMb,
      samples: samples.length
    },
    samples
  };

  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (!report.ok) {
    throw new Error(`Idle performance smoke failed. Report: ${reportPath}`);
  }
  console.log(`Idle performance smoke passed. Report: ${reportPath}`);
} finally {
  await app.close();
}

async function firstReadyWindow(appInstance) {
  const page = await appInstance.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1200);
  return page;
}

async function collectMetrics(appInstance) {
  const metrics = await appInstance.evaluate(({ app: electronApp }) => {
    return electronApp.getAppMetrics().map((metric) => ({
      pid: metric.pid,
      type: metric.type,
      cpu: {
        percentCPUUsage: metric.cpu.percentCPUUsage,
        idleWakeupsPerSecond: metric.cpu.idleWakeupsPerSecond
      },
      memory: {
        workingSetSize: metric.memory.workingSetSize,
        peakWorkingSetSize: metric.memory.peakWorkingSetSize,
        privateBytes: metric.memory.privateBytes
      }
    }));
  });
  const totalCpuPercent = round2(metrics.reduce((total, metric) => total + metric.cpu.percentCPUUsage, 0));
  const totalWorkingSetMb = round2(metrics.reduce((total, metric) => total + metric.memory.workingSetSize, 0) / 1024);
  return {
    atMs: Date.now(),
    totalCpuPercent,
    totalWorkingSetMb,
    processCount: metrics.length,
    metrics
  };
}

async function resetDirectory(dir) {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
}

function createIdleSave() {
  return {
    version: 1,
    heroName: "Ari",
    level: 10,
    xp: 50,
    levelPoints: 9,
    gold: 1400,
    relics: 0,
    parts: 64,
    essence: 1,
    stage: 18,
    zone: 2,
    highestStage: 18,
    heroHp: 620,
    enemyHp: 900,
    enemySeed: 3,
    overdrive: 20,
    gear: {
      blade: 8,
      armor: 6,
      banner: 4,
      goggles: 3,
      engine: 3
    },
    skills: {
      cleave: 1,
      bulwark: 1,
      treasury: 1,
      pressure: 1,
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
    kills: 32,
    bossesDefeated: 1,
    totalGold: 5200,
    claimedContracts: [],
    introSeen: true,
    seenBossStories: [1],
    campaignCleared: false,
    battlePlan: "farm",
    lastSavedAt: Date.now()
  };
}

function average(values) {
  if (values.length === 0) {
    return 0;
  }
  return round2(values.reduce((total, value) => total + value, 0) / values.length);
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}
