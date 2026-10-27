import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { _electron as electron } from "playwright";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const artifactDir = path.join(root, "qa-artifacts");
const packageName = "AFK HERO";
const version = "1.0.0";
const arch = "arm64";
const dmgPath = path.join(root, "release", `${packageName}-${version}-${arch}.dmg`);
const mountPoint = path.join(artifactDir, "dmg-smoke-mount");
const userDataDir = path.join(artifactDir, "user-data-dmg-smoke");
const titleScreenshotPath = path.join(artifactDir, "dmg-smoke-title.png");
const battleScreenshotPath = path.join(artifactDir, "dmg-smoke-battle.png");
const reportPath = path.join(artifactDir, "dmg-smoke.json");

if (!existsSync(dmgPath)) {
  throw new Error(`DMG not found: ${dmgPath}. Run npm run release:mac first.`);
}

await mkdir(artifactDir, { recursive: true });
await resetDirectory(userDataDir);
await rm(mountPoint, { recursive: true, force: true });
await mkdir(mountPoint, { recursive: true });

const report = {
  checkedAt: new Date().toISOString(),
  dmgPath,
  mountPoint,
  mountedAppPath: path.join(mountPoint, `${packageName}.app`),
  titleScreenshotPath,
  battleScreenshotPath,
  checks: []
};

let mounted = false;
try {
  const attach = await runCommand("hdiutil", ["attach", dmgPath, "-readonly", "-nobrowse", "-mountpoint", mountPoint]);
  report.checks.push({ name: "DMG readonly mount", ...attach });
  if (!attach.ok) {
    throw new Error(`Failed to mount DMG: ${attach.stderr || attach.stdout}`);
  }
  mounted = true;

  const mountedExecutable = path.join(mountPoint, `${packageName}.app`, "Contents", "MacOS", packageName);
  if (!existsSync(mountedExecutable)) {
    throw new Error(`Mounted app executable not found: ${mountedExecutable}`);
  }

  const app = await electron.launch({
    executablePath: mountedExecutable,
    env: {
      ...process.env,
      AFK_HERO_USER_DATA_DIR: userDataDir,
      ELECTRON_ENABLE_LOGGING: "1"
    }
  });

  try {
    const page = await app.firstWindow();
    await page.waitForLoadState("domcontentloaded");
    await page.getByText("AFK HERO").waitFor({ timeout: 7000 });
    await page.getByRole("button", { name: "Start" }).waitFor({ timeout: 7000 });
    const titleScreenshot = await page.screenshot({ path: titleScreenshotPath, fullPage: false });
    if (titleScreenshot.length < 10000) {
      throw new Error(`Mounted DMG title screenshot is unexpectedly small: ${titleScreenshot.length}`);
    }

    await page.getByRole("button", { name: "Start" }).click();
    await page.getByRole("button", { name: "Next Memory" }).waitFor({ timeout: 3000 });
    await page.getByRole("button", { name: "Next Memory" }).click();
    await page.getByRole("button", { name: "Next Memory" }).click();
    await page.getByRole("button", { name: "Begin Expedition" }).click();
    await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
    await page.getByLabel("Save status: Saved").waitFor({ timeout: 5000 });
    const canvasStats = await getCanvasPixelStats(page);
    if (!canvasStats.ok) {
      throw new Error(`Mounted DMG battle canvas is blank: ${JSON.stringify(canvasStats)}`);
    }
    const battleScreenshot = await page.screenshot({ path: battleScreenshotPath, fullPage: false });
    if (battleScreenshot.length < 10000) {
      throw new Error(`Mounted DMG battle screenshot is unexpectedly small: ${battleScreenshot.length}`);
    }

    const resourceAudit = await assertLocalOnlyResourceAudit(page);
    report.launched = true;
    report.firstRunPlayable = true;
    report.resourceAudit = resourceAudit;
    report.canvasStats = canvasStats;
    report.titleScreenshotBytes = titleScreenshot.length;
    report.battleScreenshotBytes = battleScreenshot.length;
    report.bodyTextSample = (await page.locator("body").innerText()).slice(0, 240);
  } finally {
    await app.close();
  }
} finally {
  if (mounted) {
    const detach = await runCommand("hdiutil", ["detach", mountPoint, "-force"]);
    report.checks.push({ name: "DMG detach", ...detach });
  }
  await rm(mountPoint, { recursive: true, force: true });
}

report.ok = Boolean(
  report.launched &&
    report.firstRunPlayable &&
    report.resourceAudit?.ok &&
    report.canvasStats?.ok &&
    report.checks.every((check) => check.ok)
);

await writeFile(reportPath, JSON.stringify(report, null, 2));

if (!report.ok) {
  console.error(`DMG smoke failed. Report: ${reportPath}`);
  process.exit(1);
}

console.log(`DMG smoke passed. Report: ${reportPath}`);

async function assertLocalOnlyResourceAudit(page) {
  const audit = await page.evaluate(() => {
    const entries = performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter(Boolean);
    const urls = [window.location.href, ...entries];
    const externalUrls = urls.filter((url) => /^https?:\/\//i.test(url));
    const schemes = [...new Set(urls.map((url) => url.split(":")[0]).filter(Boolean))].sort();
    return {
      ok: externalUrls.length === 0,
      checkedUrlCount: urls.length,
      schemes,
      externalUrls
    };
  });

  if (!audit.ok) {
    throw new Error(`Mounted DMG app loaded external resources: ${JSON.stringify(audit.externalUrls)}`);
  }

  return audit;
}

async function getCanvasPixelStats(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) {
      return { ok: false, unique: 0 };
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return { ok: false, unique: 0 };
    }
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const unique = new Set();
    for (let index = 0; index < data.length; index += 800) {
      unique.add(`${data[index]},${data[index + 1]},${data[index + 2]},${data[index + 3]}`);
      if (unique.size > 16) {
        break;
      }
    }
    return { ok: unique.size > 16, unique: unique.size };
  });
}

async function resetDirectory(dir) {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
}

async function runCommand(command, args) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { maxBuffer: 1024 * 1024 });
    return { ok: true, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout?.trim?.() ?? "",
      stderr: error.stderr?.trim?.() ?? error.message
    };
  }
}
