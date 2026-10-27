import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { _electron as electron } from "playwright";

const root = process.cwd();
const executablePath = path.join(root, "release", "mac-arm64", "AFK HERO.app", "Contents", "MacOS", "AFK HERO");
const artifactDir = process.env.AFK_HERO_QA_ARTIFACT_DIR ? path.resolve(process.env.AFK_HERO_QA_ARTIFACT_DIR) : path.join(root, "qa-artifacts");
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const builderConfig = JSON.parse(await readFile(path.join(root, "electron-builder.json"), "utf8"));
const maxFreshBattleStartMs = 10_000;

const { normalizeSavePayloadForDisk } = createRequire(import.meta.url)("../electron/save-guard.cjs");
const fixtureFactories = [createBossReadySave, createBossVisualSave, createCampaignClearSave, createRetryStageSave, createMapTravelSave, createRecoverySave, createRestoreBackupCurrentSave, createOfflineRewardSave, createShortOfflineRewardSave, createLootEquipBestSave, createAutoSellLootSave, createForgeAllGearSave, createClaimAllContractsSave, createSkillRespecSave, createSkillCapSave, createExportSmokeSave];
const fixtureFailures = [];
for (const factory of fixtureFactories) {
  try { normalizeSavePayloadForDisk(factory()); }
  catch (error) { fixtureFailures.push({ fixture: factory.name, error: error.message }); }
}
if (fixtureFailures.length) throw new Error(`Smoke fixture schema mismatch: ${JSON.stringify(fixtureFailures)}`);
if (process.argv.includes("--fixtures-only")) {
  console.log(JSON.stringify({ ok: true, checked: fixtureFactories.length, fixtures: fixtureFactories.map((factory) => factory.name) }));
  process.exit(0);
}

if (!existsSync(executablePath)) {
  throw new Error(`Packaged app not found: ${executablePath}. Run npm run release:mac first.`);
}

await mkdir(artifactDir, { recursive: true });

const freshResult = await runFreshSaveSmoke();
const resumeResult = await runRelaunchResumeSmoke();
const shortOfflineRewardResult = await runShortOfflineRewardSmoke();
const offlineRewardResult = await runOfflineRewardSmoke();
const bossVisualResult = await runBossVisualSmoke();
const retryStageResult = await runRetryStageSmoke();
const mapTravelResult = await runMapTravelSmoke();
const bossResult = await runBossStorySmoke();
const campaignClearResult = await runCampaignClearSmoke();
const exportResult = await runSaveExportSmoke();
const importResult = await runSaveImportSmoke();
const lootEquipBestResult = await runLootEquipBestSmoke();
const autoSellLootResult = await runAutoSellLootSmoke();
const forgeAllGearResult = await runForgeAllGearSmoke();
const claimAllResult = await runClaimAllContractsSmoke();
const reportActionResult = await runReportActionSmoke();
const skillRespecResult = await runSkillRespecSmoke();
const skillCapResult = await runSkillCapSmoke();
const invalidImportResult = await runInvalidSaveImportSmoke();
const resetResult = await runResetConfirmationSmoke();
const recoveryResult = await runSaveRecoverySmoke();
const restoreBackupResult = await runRestoreBackupSmoke();

await writeFile(
  path.join(artifactDir, "packaged-smoke.json"),
  JSON.stringify(
    {
      executablePath,
      freshResult,
      resumeResult,
      shortOfflineRewardResult,
      offlineRewardResult,
      bossVisualResult,
      retryStageResult,
      mapTravelResult,
      bossResult,
      campaignClearResult,
      exportResult,
      importResult,
      lootEquipBestResult,
      autoSellLootResult,
      forgeAllGearResult,
      claimAllResult,
      reportActionResult,
      skillRespecResult,
      skillCapResult,
      invalidImportResult,
      resetResult,
      recoveryResult,
      restoreBackupResult,
      checkedAt: new Date().toISOString()
    },
    null,
    2
  )
);

async function runFreshSaveSmoke() {
  const userDataDir = path.join(artifactDir, "user-data-fresh");
  await resetDirectory(userDataDir);
  const smokeStartedAt = Date.now();
  const app = await launchWithUserData(userDataDir);
  try {
    const page = await firstReadyWindow(app);
    const menuResult = await readApplicationMenuSnapshot(app);
    await expectText(page, "AFK HERO");
    const titleLayout = await assertLayoutAudit(page, "fresh-title");
    await page.getByRole("button", { name: "Start" }).click();
    await page.getByRole("button", { name: "Next Memory" }).waitFor({ timeout: 3000 });
    const openingLayout = await assertLayoutAudit(page, "fresh-opening");
    await page.getByRole("button", { name: "Next Memory" }).click();
    await page.getByRole("button", { name: "Next Memory" }).click();
    await page.getByRole("button", { name: "Begin Expedition" }).click();
    await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
    const battleStartElapsedMs = Date.now() - smokeStartedAt;
    if (battleStartElapsedMs > maxFreshBattleStartMs) {
      throw new Error(`Fresh install battle start exceeded ${maxFreshBattleStartMs}ms: ${battleStartElapsedMs}ms`);
    }
    const battleStartResult = {
      elapsedMs: battleStartElapsedMs,
      maxMs: maxFreshBattleStartMs
    };
    await page.getByLabel("Save status: Saved").waitFor({ timeout: 5000 });
    const combatFeedback = page.getByLabel("Combat feedback");
    await combatFeedback.waitFor({ timeout: 3000 });
    await combatFeedback.getByText("Hit", { exact: true }).waitFor({ timeout: 3000 });
    await combatFeedback.getByText("Burst", { exact: true }).waitFor({ timeout: 3000 });
    await combatFeedback.getByText("Threat", { exact: true }).waitFor({ timeout: 3000 });
    const rewardPreview = page.getByLabel("Reward preview");
    await rewardPreview.waitFor({ timeout: 3000 });
    await rewardPreview.getByText("Gold", { exact: true }).waitFor({ timeout: 3000 });
    await rewardPreview.getByText("Drop", { exact: true }).waitFor({ timeout: 3000 });
    await page.locator(".upgrade-preview", { hasText: "Power +" }).first().waitFor({ timeout: 3000 });
    await page.getByLabel("Reforge preview").waitFor({ timeout: 3000 });
    await page.getByText("Stage 30 required", { exact: true }).waitFor({ timeout: 3000 });
    await page.getByText("Gold/min", { exact: true }).waitFor({ timeout: 3000 });
    await page.getByText("Offline cap", { exact: true }).waitFor({ timeout: 3000 });
    const forecastResult = {
      labels: ["Clear ETA", "Gold/min", "XP/min", "Offline cap"],
      visible: true
    };
    await page.getByRole("button", { name: "Farm" }).click();
    await page.locator(".battle-plan button.active", { hasText: "Farm" }).waitFor({ timeout: 3000 });
    await page.waitForTimeout(1800);
    const savedBattlePlan = JSON.parse(await readFile(path.join(userDataDir, "save.json"), "utf8")).battlePlan;
    if (savedBattlePlan !== "farm") {
      throw new Error(`Battle plan did not persist to native save: ${savedBattlePlan}`);
    }
    await page.getByRole("button", { name: "Push" }).click();
    await page.locator(".battle-plan button.active", { hasText: "Push" }).waitFor({ timeout: 3000 });
    const battlePlanResult = { savedBattlePlan, restoredPlan: "push" };
    const gameLayout = await assertLayoutAudit(page, "fresh-game");
    await page.getByRole("tab", { name: "Map" }).click();
    await page.locator(".map-list strong", { hasText: "Brassworks Alley" }).waitFor({ timeout: 3000 });
    await page.getByText("Chronicle", { exact: true }).waitFor({ timeout: 3000 });
    await page.getByText("The Last Warm Engine", { exact: true }).waitFor({ timeout: 3000 });
    await page.locator(".chronicle-row.unlocked").filter({ hasText: "The Last Warm Engine" }).getByRole("button", { name: "Replay" }).click();
    await page.getByText("Opening Chronicle", { exact: true }).waitFor({ timeout: 3000 });
    await page.getByText("records unlocked", { exact: false }).waitFor({ timeout: 3000 });
    const storyReplayLayout = await assertLayoutAudit(page, "story-replay");
    await page.getByRole("button", { name: "Return to Map" }).click();
    await page.getByText("Chronicle", { exact: true }).waitFor({ timeout: 3000 });
    await page.getByText("Bestiary", { exact: true }).waitFor({ timeout: 3000 });
    await page.getByText("Boiler Regent", { exact: true }).waitFor({ timeout: 3000 });
    await page.getByText("Scrapper / Armored / Aerial", { exact: false }).waitFor({ timeout: 3000 });
    await page.getByLabel("Challenge Tower").waitFor({ timeout: 3000 });
    await page.getByText("Brassworks Pressure Trial", { exact: true }).waitFor({ timeout: 3000 });
    const mapLayout = await assertLayoutAudit(page, "fresh-map");
    const mapScreenshotPath = path.join(artifactDir, "packaged-smoke-map-chronicle.png");
    await page.screenshot({ path: mapScreenshotPath, fullPage: false });
    await page.getByRole("tab", { name: "Goals" }).click();
    await page.getByText("Brassworks Breakthrough", { exact: true }).waitFor({ timeout: 3000 });
    const goalsLayout = await assertLayoutAudit(page, "fresh-goals");
    await page.getByRole("tab", { name: "Loot" }).click();
    await page.waitForTimeout(300);
    const lootLayout = await assertLayoutAudit(page, "fresh-loot");
    await page.getByRole("tab", { name: "Report" }).click();
    await page.getByLabel("Run Report").waitFor({ timeout: 3000 });
    await page.getByText("Route Progress", { exact: true }).waitFor({ timeout: 3000 });
    await page.getByText("Boss Seals", { exact: true }).waitFor({ timeout: 3000 });
    await page.getByText("Next Action", { exact: true }).waitFor({ timeout: 3000 });
    await page.getByLabel("Achievement badges").waitFor({ timeout: 3000 });
    await page.getByText("First Seal", { exact: true }).waitFor({ timeout: 3000 });
    const reportLayout = await assertLayoutAudit(page, "fresh-report");
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("button", { name: "Windowed" }).waitFor({ timeout: 3000 });
    await page.getByText(packageJson.version, { exact: true }).waitFor({ timeout: 3000 });
    await page.getByText(builderConfig.appId, { exact: true }).waitFor({ timeout: 3000 });
    await page.getByLabel("Asset provenance").waitFor({ timeout: 3000 });
    await page.getByText("Generated in-project", { exact: true }).waitFor({ timeout: 3000 });
    await page.getByText("no runtime external sprite dependency", { exact: false }).waitFor({ timeout: 3000 });
    const buildIdentityResult = {
      version: packageJson.version,
      bundleId: builderConfig.appId,
      assetProvenance: "generated-local"
    };
    const settingsLayout = await assertLayoutAudit(page, "fresh-settings");
    const displayModeResult = await exerciseDisplayModes(app, page);
    const windowSettingsResult = await exerciseWindowSettings(page);
    const compactModeResult = await exerciseCompactMode(page);
    const audioSettingsResult = await exerciseAudioSettings(page);
    const runtimeSettingsResult = await exerciseRuntimeSettings(page);
    await page.getByRole("button", { name: "Return" }).click();
    const keyboardNavigationResult = await exerciseKeyboardNavigation(page);
    const menuCommandResult = await exerciseApplicationMenuCommands(app, page, userDataDir);
    const lifecycleSaveResult = await exerciseLifecycleSaveFlush(page, userDataDir);
    const pendingSaveCloseGuardResult = await exercisePendingSaveCloseGuardBridge(page);
    await page.waitForTimeout(500);

    const screenshotPath = path.join(artifactDir, "packaged-smoke-fresh.png");
    const screenshot = await page.screenshot({ path: screenshotPath, fullPage: false });
    const pixelStats = await getCanvasPixelStats(page);
    if (!pixelStats.ok || screenshot.length < 10000) {
      throw new Error(`Fresh packaged smoke screenshot/canvas check failed: ${JSON.stringify(pixelStats)}`);
    }

    const resourceAudit = await assertLocalOnlyResourceAudit(page, "fresh");
    const bodyText = await page.locator("body").innerText();
    return {
      userDataDir,
      screenshotPath,
      mapScreenshotPath,
      bodyTextSample: bodyText.slice(0, 240),
      menuResult,
      battleStartResult,
      buildIdentityResult,
      battlePlanResult,
      forecastResult,
      displayModeResult,
      windowSettingsResult,
      compactModeResult,
      audioSettingsResult,
      runtimeSettingsResult,
      keyboardNavigationResult,
      menuCommandResult,
      lifecycleSaveResult,
      pendingSaveCloseGuardResult,
      layoutAudit: [
        titleLayout,
        openingLayout,
        gameLayout,
        storyReplayLayout,
        mapLayout,
        goalsLayout,
        lootLayout,
        reportLayout,
        settingsLayout
      ],
      pixelStats,
      resourceAudit
    };
  } finally {
    await app.close();
  }
}

async function readApplicationMenuSnapshot(app) {
  const menu = await app.evaluate(({ Menu }) => {
    const applicationMenu = Menu.getApplicationMenu();
    return (applicationMenu?.items ?? []).map((item) => ({
      label: item.label,
      submenu: (item.submenu?.items ?? []).map((child) => child.label).filter(Boolean)
    }));
  });
  const flattened = menu.flatMap((item) => [item.label, ...item.submenu]);
  for (const label of ["AFK HERO", "File", "Save Now", "Settings...", "View", "Windowed", "Borderless", "Fullscreen"]) {
    if (!flattened.includes(label)) {
      throw new Error(`Application menu is missing ${label}: ${JSON.stringify(menu)}`);
    }
  }
  return menu;
}

async function exercisePendingSaveCloseGuardBridge(page) {
  const enabled = await page.evaluate(() => window.afkHeroLifecycle?.setSavePending(true));
  if (!enabled?.ok) {
    throw new Error(`Save pending lifecycle bridge did not enable: ${JSON.stringify(enabled)}`);
  }
  const disabled = await page.evaluate(() => window.afkHeroLifecycle?.setSavePending(false));
  if (!disabled?.ok) {
    throw new Error(`Save pending lifecycle bridge did not disable: ${JSON.stringify(disabled)}`);
  }
  return { enabled, disabled };
}

async function exerciseApplicationMenuCommands(app, page, userDataDir) {
  await clickApplicationMenuItem(app, "Settings...");
  await page.getByRole("button", { name: "Windowed" }).waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: "Save Now" }).waitFor({ timeout: 3000 });
  const settingsViaMenuLayout = await assertLayoutAudit(page, "menu-settings-command");
  await page.getByRole("button", { name: "Return" }).click();
  await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });

  await clickApplicationMenuItem(app, "Windowed");
  await page.getByRole("button", { name: "Windowed" }).waitFor({ timeout: 3000 });
  const windowed = await waitForDisplayState(page, "menu-windowed-command", (state) => {
    return (
      !state.window.isFullScreen &&
      !state.window.isSimpleFullScreen &&
      Math.abs(state.window.aspectRatio - 16 / 9) < 0.02
    );
  });
  const persistedMode = await page.evaluate(() => localStorage.getItem("afk-hero-display-mode-v1"));
  if (persistedMode !== "windowed") {
    throw new Error(`Expected menu Windowed command to persist windowed mode, received ${persistedMode}`);
  }
  await page.getByRole("button", { name: "Return" }).click();
  await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });

  await page.getByRole("button", { name: "Farm" }).click();
  await page.locator(".battle-plan button.active", { hasText: "Farm" }).waitFor({ timeout: 3000 });
  await clickApplicationMenuItem(app, "Save Now");
  await page.getByLabel("Save status: Saved").waitFor({ timeout: 5000 });
  const manualSaveState = await waitForSavedState(
    userDataDir,
    (state) => state.battlePlan === "farm" && typeof state.lastSavedAt === "number",
    "native menu save now"
  );

  return {
    commands: ["Settings...", "Windowed", "Save Now"],
    settingsViaMenuLayout,
    windowed,
    persistedMode,
    manualSave: {
      battlePlan: manualSaveState.battlePlan,
      savedAt: manualSaveState.lastSavedAt,
      stage: manualSaveState.stage
    }
  };
}

async function exerciseLifecycleSaveFlush(page, userDataDir) {
  await page.getByRole("button", { name: "Farm" }).click();
  await page.locator(".battle-plan button.active", { hasText: "Farm" }).waitFor({ timeout: 3000 });
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));
  await page.getByLabel("Save status: Saved").waitFor({ timeout: 5000 });
  const savedState = await waitForSavedState(
    userDataDir,
    (state) => state.battlePlan === "farm" && typeof state.lastSavedAt === "number",
    "lifecycle pagehide save"
  );
  return {
    event: "pagehide",
    savedBattlePlan: savedState.battlePlan,
    savedAt: savedState.lastSavedAt,
    stage: savedState.stage
  };
}

async function clickApplicationMenuItem(app, label) {
  const clicked = await app.evaluate(({ Menu, BrowserWindow }, targetLabel) => {
    const findItem = (items) => {
      for (const item of items) {
        if (item.label === targetLabel) {
          return item;
        }
        const nested = item.submenu ? findItem(item.submenu.items) : undefined;
        if (nested) {
          return nested;
        }
      }
      return undefined;
    };
    const item = findItem(Menu.getApplicationMenu()?.items ?? []);
    if (!item || typeof item.click !== "function") {
      return false;
    }
    item.click(item, BrowserWindow.getAllWindows()[0]);
    return true;
  }, label);
  if (!clicked) {
    throw new Error(`Application menu item not clickable: ${label}`);
  }
}

async function runOfflineRewardSmoke() {
  const userDataDir = path.join(artifactDir, "user-data-offline-reward");
  await resetDirectory(userDataDir);
  await writeFile(path.join(userDataDir, "save.json"), JSON.stringify(createOfflineRewardSave(), null, 2), "utf8");

  const app = await launchWithUserData(userDataDir);
  try {
    const page = await firstReadyWindow(app);
    await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
    const rewardBanner = page.locator(".offline-reward");
    await rewardBanner.waitFor({ timeout: 5000 });
    const rewardText = await rewardBanner.innerText();
    if (!rewardText.includes("Offline reward:") || !rewardText.includes("gold") || !rewardText.includes("Offline cap reached")) {
      throw new Error(`Offline reward banner did not include reward details: ${rewardText}`);
    }
    const layoutAudit = await assertLayoutAudit(page, "offline-reward");
    const screenshotPath = path.join(artifactDir, "packaged-smoke-offline-reward.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const resourceAudit = await assertLocalOnlyResourceAudit(page, "offline-reward");
    const bodyText = await page.locator("body").innerText();
    return {
      userDataDir,
      screenshotPath,
      layoutAudit,
      resourceAudit,
      rewardText,
      bodyTextSample: bodyText.slice(0, 260)
    };
  } finally {
    await app.close();
  }
}

async function runShortOfflineRewardSmoke() {
  const userDataDir = path.join(artifactDir, "user-data-short-offline-reward");
  await resetDirectory(userDataDir);
  await writeFile(path.join(userDataDir, "save.json"), JSON.stringify(createShortOfflineRewardSave(), null, 2), "utf8");

  const app = await launchWithUserData(userDataDir);
  try {
    const page = await firstReadyWindow(app);
    await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
    const rewardBanner = page.locator(".offline-reward");
    await rewardBanner.waitFor({ timeout: 5000 });
    const rewardText = await rewardBanner.innerText();
    if (
      !rewardText.includes("Offline reward:") ||
      !rewardText.includes("gold") ||
      !rewardText.includes("XP") ||
      rewardText.includes("Offline cap reached")
    ) {
      throw new Error(`Short offline reward banner did not include expected non-cap reward details: ${rewardText}`);
    }
    const savedState = await waitForSavedState(
      userDataDir,
      (state) =>
        state.lastOfflineReward?.seconds >= 5 * 60 &&
        state.lastOfflineReward?.seconds < 8 * 60 * 60 &&
        state.lastOfflineReward?.capped === false &&
        state.lastOfflineReward?.gold > 0,
      "short offline reward save"
    );
    const layoutAudit = await assertLayoutAudit(page, "short-offline-reward");
    const screenshotPath = path.join(artifactDir, "packaged-smoke-short-offline-reward.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const resourceAudit = await assertLocalOnlyResourceAudit(page, "short-offline-reward");
    return {
      userDataDir,
      screenshotPath,
      layoutAudit,
      resourceAudit,
      rewardText,
      lastOfflineReward: savedState.lastOfflineReward
    };
  } finally {
    await app.close();
  }
}

async function runRelaunchResumeSmoke() {
  const userDataDir = path.join(artifactDir, "user-data-resume");
  await resetDirectory(userDataDir);
  const firstApp = await launchWithUserData(userDataDir);
  let firstBodyText = "";
  try {
    const page = await firstReadyWindow(firstApp);
    await page.getByRole("button", { name: "Start" }).click();
    await page.getByRole("button", { name: "Next Memory" }).click();
    await page.getByRole("button", { name: "Next Memory" }).click();
    await page.getByRole("button", { name: "Begin Expedition" }).click();
    await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
    await page.getByLabel("Save status: Saved").waitFor({ timeout: 5000 });
    await page.waitForTimeout(1800);
    firstBodyText = await page.locator("body").innerText();
  } finally {
    await firstApp.close();
  }

  const secondApp = await launchWithUserData(userDataDir);
  try {
    const page = await firstReadyWindow(secondApp);
    await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
    await page.getByLabel("Save status: Save ready").waitFor({ timeout: 5000 });
    const layoutAudit = await assertLayoutAudit(page, "relaunch-resume");
    const screenshotPath = path.join(artifactDir, "packaged-smoke-resume.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const resourceAudit = await assertLocalOnlyResourceAudit(page, "relaunch-resume");
    const bodyText = await page.locator("body").innerText();
    if (bodyText.includes("Start\nOpening") || bodyText.includes("Begin Expedition")) {
      throw new Error("Relaunch resume returned to onboarding instead of battle screen");
    }
    return {
      userDataDir,
      screenshotPath,
      firstBodyTextSample: firstBodyText.slice(0, 180),
      bodyTextSample: bodyText.slice(0, 240),
      layoutAudit,
      resourceAudit
    };
  } finally {
    await secondApp.close();
  }
}

async function runBossVisualSmoke() {
  const userDataDir = path.join(artifactDir, "user-data-boss-visual");
  await resetDirectory(userDataDir);
  await writeFile(path.join(userDataDir, "save.json"), JSON.stringify(createBossVisualSave(), null, 2), "utf8");

  const app = await launchWithUserData(userDataDir);
  try {
    const page = await firstReadyWindow(app);
    await page.getByText("Boiler Regent").waitFor({ timeout: 5000 });
    await page.getByText("Boss", { exact: true }).waitFor({ timeout: 5000 });
    await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
    await page.waitForTimeout(400);
    const layoutAudit = await assertLayoutAudit(page, "boss-visual");

    const screenshotPath = path.join(artifactDir, "packaged-smoke-boss-visual.png");
    const screenshot = await page.screenshot({ path: screenshotPath, fullPage: false });
    const pixelStats = await getCanvasPixelStats(page);
    if (!pixelStats.ok || screenshot.length < 10000) {
      throw new Error(`Boss visual smoke screenshot/canvas check failed: ${JSON.stringify(pixelStats)}`);
    }

    const resourceAudit = await assertLocalOnlyResourceAudit(page, "boss-visual");
    const bodyText = await page.locator("body").innerText();
    return {
      userDataDir,
      screenshotPath,
      bodyTextSample: bodyText.slice(0, 240),
      layoutAudit,
      pixelStats,
      resourceAudit
    };
  } finally {
    await app.close();
  }
}

async function runRetryStageSmoke() {
  const userDataDir = path.join(artifactDir, "user-data-retry-stage");
  await resetDirectory(userDataDir);
  await writeFile(path.join(userDataDir, "save.json"), JSON.stringify(createRetryStageSave(), null, 2), "utf8");

  const app = await launchWithUserData(userDataDir);
  try {
    const page = await firstReadyWindow(app);
    await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
    await page.getByRole("button", { name: "Retry Boss" }).click();
    const savedState = await waitForSavedState(
      userDataDir,
      (state) =>
        state.stage === 10 &&
        state.highestStage === 10 &&
        state.enemySeed === 8 &&
        state.heroHp > 0 &&
        state.enemyHp > 500,
      "retry stage save"
    );
    const layoutAudit = await assertLayoutAudit(page, "retry-stage");
    const screenshotPath = path.join(artifactDir, "packaged-smoke-retry-stage.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const resourceAudit = await assertLocalOnlyResourceAudit(page, "retry-stage");
    return {
      userDataDir,
      screenshotPath,
      layoutAudit,
      resourceAudit,
      stage: savedState.stage,
      highestStage: savedState.highestStage,
      heroHp: savedState.heroHp,
      enemyHp: savedState.enemyHp,
      enemySeed: savedState.enemySeed
    };
  } finally {
    await app.close();
  }
}

async function runSaveRecoverySmoke() {
  const userDataDir = path.join(artifactDir, "user-data-recovery");
  await resetDirectory(userDataDir);
  await writeFile(path.join(userDataDir, "save.json"), "{broken-json", "utf8");
  await writeFile(path.join(userDataDir, "save.json.backup"), JSON.stringify(createRecoverySave(), null, 2), "utf8");

  const app = await launchWithUserData(userDataDir);
  try {
    const page = await firstReadyWindow(app);
    await page.getByLabel("Save status: Save blocked: original preserved", { exact: true }).waitFor({ state: "visible", timeout: 5000 });
    await page.waitForTimeout(1800);
    if (await readFile(path.join(userDataDir, "save.json"), "utf8") !== "{broken-json") {
      throw new Error("Autosave replaced an unreadable primary");
    }
    const writeBlocked = await page.evaluate(async () => {
      const backup = await window.afkHeroStore.restoreBackup();
      try { await window.afkHeroStore.write(backup.state); return false; } catch { return true; }
    });
    if (!writeBlocked) throw new Error("Native write bypassed unreadable save barrier");
    await page.getByRole("button", { name: "Restore Backup", exact: true }).click();
    await page.getByText("Stage", { exact: true }).waitFor({ timeout: 5000 });
    await expectText(page, "22/120");
    const archived = (await readdir(userDataDir)).filter((name) => name.startsWith("save.json.unreadable-"));
    if (archived.length !== 1 || await readFile(path.join(userDataDir, archived[0]), "utf8") !== "{broken-json") {
      throw new Error("Explicit backup recovery did not preserve unreadable primary bytes");
    }
    await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
    const layoutAudit = await assertLayoutAudit(page, "save-recovery");
    const screenshotPath = path.join(artifactDir, "packaged-smoke-save-recovery.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const resourceAudit = await assertLocalOnlyResourceAudit(page, "save-recovery");
    const bodyText = await page.locator("body").innerText();
    return {
      userDataDir,
      screenshotPath,
      layoutAudit,
      resourceAudit,
      bodyTextSample: bodyText.slice(0, 240)
    };
  } finally {
    await app.close();
  }
}

async function runRestoreBackupSmoke() {
  const userDataDir = path.join(artifactDir, "user-data-restore-backup");
  await resetDirectory(userDataDir);
  await writeFile(path.join(userDataDir, "save.json"), JSON.stringify(createRestoreBackupCurrentSave(), null, 2), "utf8");
  await writeFile(path.join(userDataDir, "save.json.backup"), JSON.stringify(createRecoverySave(), null, 2), "utf8");

  const app = await launchWithUserData(userDataDir);
  try {
    const page = await firstReadyWindow(app);
    await page.getByText("5/120").waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("button", { name: "Restore Backup" }).click();
    await page.getByText("22/120").waitFor({ timeout: 5000 });
    await page.getByLabel("Save status: Backup restored").waitFor({ timeout: 5000 });
    const savedState = JSON.parse(await readFile(path.join(userDataDir, "save.json"), "utf8"));
    if (savedState.stage !== 22 || savedState.highestStage !== 22) {
      throw new Error(`Restore Backup did not promote backup save: ${JSON.stringify(savedState).slice(0, 500)}`);
    }
    const layoutAudit = await assertLayoutAudit(page, "restore-backup");
    const screenshotPath = path.join(artifactDir, "packaged-smoke-restore-backup.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const resourceAudit = await assertLocalOnlyResourceAudit(page, "restore-backup");
    return {
      userDataDir,
      screenshotPath,
      layoutAudit,
      resourceAudit,
      restoredStage: savedState.stage,
      restoredHighestStage: savedState.highestStage
    };
  } finally {
    await app.close();
  }
}

async function runSaveImportSmoke() {
  const userDataDir = path.join(artifactDir, "user-data-import");
  const importPath = path.join(artifactDir, "import-save.json");
  await resetDirectory(userDataDir);
  await writeFile(path.join(userDataDir, "save.json"), JSON.stringify(createBossVisualSave(), null, 2), "utf8");
  await writeFile(importPath, JSON.stringify(createSaveExport(createRecoverySave()), null, 2), "utf8");

  const app = await launchWithUserData(userDataDir);
  try {
    const page = await firstReadyWindow(app);
    await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("button", { name: "Export Save" }).waitFor({ timeout: 3000 });
    await page.getByRole("button", { name: "Import Save" }).waitFor({ timeout: 3000 });
    await page.getByLabel("Import save file").setInputFiles(importPath);
    await page.getByText("22/120").waitFor({ timeout: 5000 });
    await page.getByLabel("Save status: Save imported").waitFor({ timeout: 5000 });
    const layoutAudit = await assertLayoutAudit(page, "save-import");

    const screenshotPath = path.join(artifactDir, "packaged-smoke-save-import.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const resourceAudit = await assertLocalOnlyResourceAudit(page, "save-import");
    const bodyText = await page.locator("body").innerText();
    return {
      userDataDir,
      importPath,
      screenshotPath,
      layoutAudit,
      resourceAudit,
      bodyTextSample: bodyText.slice(0, 240)
    };
  } finally {
    await app.close();
  }
}

async function runLootEquipBestSmoke() {
  const userDataDir = path.join(artifactDir, "user-data-loot-equip-best");
  await resetDirectory(userDataDir);
  await writeFile(path.join(userDataDir, "save.json"), JSON.stringify(createLootEquipBestSave(), null, 2), "utf8");

  const app = await launchWithUserData(userDataDir);
  try {
    const page = await firstReadyWindow(app);
    await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
    await page.getByLabel("Latest drop").waitFor({ timeout: 3000 });
    await page.getByText("Epic Starforged Blade", { exact: false }).waitFor({ timeout: 3000 });
    await page.getByRole("tab", { name: "Loot" }).click();
    await page.getByRole("button", { name: "Equip Best" }).waitFor({ timeout: 3000 });
    await page.getByRole("button", { name: "Sell Common" }).waitFor({ timeout: 3000 });
    const beforeLayout = await assertLayoutAudit(page, "loot-equip-best-before");
    await page.locator(".loot-row").filter({ hasText: "Common Aether Goggles" }).getByRole("button", { name: "Lock" }).click();
    await page.locator(".loot-row.locked").filter({ hasText: "Common Aether Goggles" }).waitFor({ timeout: 3000 });
    await page.getByRole("button", { name: "Equip Best" }).click();
    await page.getByText("Equipped").first().waitFor({ timeout: 3000 });
    await page.getByRole("button", { name: "Sell Common" }).click();
    await page.waitForTimeout(1800);
    const savedState = JSON.parse(await readFile(path.join(userDataDir, "save.json"), "utf8"));
    if (savedState.equipped.blade !== "loot-strong-blade" || savedState.equipped.armor !== "loot-armor") {
      throw new Error(`Equip Best did not persist expected equipment: ${JSON.stringify(savedState.equipped)}`);
    }
    if (savedState.inventory.some((item) => item.id === "loot-weak-blade")) {
      throw new Error("Sell Common did not remove the unequipped common blade");
    }
    const lockedItem = savedState.inventory.find((item) => item.id === "loot-locked-goggles");
    if (!lockedItem?.locked) {
      throw new Error(`Locked common item was not preserved: ${JSON.stringify(savedState.inventory)}`);
    }
    const layoutAudit = await assertLayoutAudit(page, "loot-equip-best-after");
    const screenshotPath = path.join(artifactDir, "packaged-smoke-loot-equip-best.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const resourceAudit = await assertLocalOnlyResourceAudit(page, "loot-equip-best");
    return {
      userDataDir,
      screenshotPath,
      equipped: savedState.equipped,
      remainingInventory: savedState.inventory.map((item) => item.id),
      gold: savedState.gold,
      parts: savedState.parts,
      layoutAudit: [beforeLayout, layoutAudit],
      resourceAudit
    };
  } finally {
    await app.close();
  }
}

async function runAutoSellLootSmoke() {
  const userDataDir = path.join(artifactDir, "user-data-auto-sell-loot");
  await resetDirectory(userDataDir);
  await writeFile(path.join(userDataDir, "save.json"), JSON.stringify(createAutoSellLootSave(), null, 2), "utf8");

  const app = await launchWithUserData(userDataDir);
  try {
    const page = await firstReadyWindow(app);
    await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
    await page.getByRole("tab", { name: "Loot" }).click();
    const commonAutoSellButton = page.getByLabel("Auto-sell filters").getByRole("button", { name: "Common", exact: true });
    await commonAutoSellButton.waitFor({ timeout: 3000 });
    await commonAutoSellButton.evaluate((button) => {
      if (button.getAttribute("aria-pressed") !== "true") {
        throw new Error("Common auto-sell filter is not active");
      }
    });
    const savedState = await waitForSavedState(
      userDataDir,
      (state) =>
        state.kills >= 5 &&
        Array.isArray(state.autoSellRarities) &&
        state.autoSellRarities.includes("common") &&
        state.inventory?.length === 1 &&
        state.inventory[0]?.id === "auto-keep-goggles" &&
        state.gold > 0 &&
        state.parts > 0,
      "auto-sell loot save"
    );
    await page.getByText("Auto-Sell", { exact: true }).waitFor({ timeout: 3000 });
    const layoutAudit = await assertLayoutAudit(page, "auto-sell-loot");
    const screenshotPath = path.join(artifactDir, "packaged-smoke-auto-sell-loot.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const resourceAudit = await assertLocalOnlyResourceAudit(page, "auto-sell-loot");
    return {
      userDataDir,
      screenshotPath,
      layoutAudit,
      resourceAudit,
      autoSellRarities: savedState.autoSellRarities,
      inventory: savedState.inventory.map((item) => item.id),
      gold: savedState.gold,
      parts: savedState.parts
    };
  } finally {
    await app.close();
  }
}

async function runForgeAllGearSmoke() {
  const userDataDir = path.join(artifactDir, "user-data-forge-all");
  await resetDirectory(userDataDir);
  await writeFile(path.join(userDataDir, "save.json"), JSON.stringify(createForgeAllGearSave(), null, 2), "utf8");

  const app = await launchWithUserData(userDataDir);
  try {
    const page = await firstReadyWindow(app);
    await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
    await page.getByRole("tab", { selected: true }).filter({ hasText: "Forge" }).waitFor({ timeout: 3000 });
    await page.getByText("Workshop Queue", { exact: true }).waitFor({ timeout: 3000 });
    await page.getByRole("button", { name: "Craft Gear" }).click();
    await waitForSavedState(
      userDataDir,
      (state) => Array.isArray(state.inventory) && state.inventory.some((item) => /^crafted-/.test(item.id)),
      "craft gear save"
    );
    await page.getByRole("button", { name: "Forge All" }).click();
    const savedState = await waitForSavedState(
      userDataDir,
      (state) =>
        state.gold < 420 &&
        state.parts < 120 &&
        state.inventory?.some((item) => /^crafted-/.test(item.id)) &&
        Object.values(state.gear ?? {}).reduce((sum, level) => sum + level, 0) > 5,
      "forge all gear save"
    );
    await page.getByText("Workshop Queue", { exact: true }).waitFor({ timeout: 3000 });
    const layoutAudit = await assertLayoutAudit(page, "forge-all-gear");
    const screenshotPath = path.join(artifactDir, "packaged-smoke-forge-all-gear.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const resourceAudit = await assertLocalOnlyResourceAudit(page, "forge-all-gear");
    return {
      userDataDir,
      screenshotPath,
      layoutAudit,
      resourceAudit,
      gear: savedState.gear,
      crafted: savedState.inventory.find((item) => /^crafted-/.test(item.id))?.name,
      gold: savedState.gold,
      parts: savedState.parts
    };
  } finally {
    await app.close();
  }
}

async function runClaimAllContractsSmoke() {
  const userDataDir = path.join(artifactDir, "user-data-claim-all");
  await resetDirectory(userDataDir);
  await writeFile(path.join(userDataDir, "save.json"), JSON.stringify(createClaimAllContractsSave(), null, 2), "utf8");

  const app = await launchWithUserData(userDataDir);
  try {
    const page = await firstReadyWindow(app);
    await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
    await page.getByRole("tab", { name: "Goals" }).click();
    await page.getByRole("button", { name: "Claim All" }).click();
    await page.getByText("0 ready", { exact: true }).waitFor({ timeout: 3000 });
    await page.locator(".contract-row.claimed").filter({ hasText: "Upper City Route" }).waitFor({ timeout: 3000 });
    const savedState = await waitForSavedState(
      userDataDir,
      (state) => Array.isArray(state.claimedContracts) && state.claimedContracts.length === 6,
      "claim all contracts save"
    );
    const expectedIds = ["stage-10", "kills-50", "bosses-3", "level-15", "equipment-8", "stage-60"];
    if (expectedIds.some((id) => !savedState.claimedContracts.includes(id))) {
      throw new Error(`Claim All did not persist all contract ids: ${JSON.stringify(savedState.claimedContracts)}`);
    }
    const layoutAudit = await assertLayoutAudit(page, "claim-all-goals");
    const screenshotPath = path.join(artifactDir, "packaged-smoke-claim-all-goals.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const resourceAudit = await assertLocalOnlyResourceAudit(page, "claim-all-goals");
    return {
      userDataDir,
      screenshotPath,
      layoutAudit,
      resourceAudit,
      claimedContracts: savedState.claimedContracts,
      gold: savedState.gold,
      parts: savedState.parts,
      relics: savedState.relics,
      essence: savedState.essence,
      levelPoints: savedState.levelPoints
    };
  } finally {
    await app.close();
  }
}

async function runReportActionSmoke() {
  const userDataDir = path.join(artifactDir, "user-data-report-action");
  await resetDirectory(userDataDir);
  await writeFile(path.join(userDataDir, "save.json"), JSON.stringify(createClaimAllContractsSave(), null, 2), "utf8");

  const app = await launchWithUserData(userDataDir);
  try {
    const page = await firstReadyWindow(app);
    await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
    await page.getByRole("tab", { name: "Report" }).click();
    await page.getByLabel("Run Report").waitFor({ timeout: 3000 });
    await page.getByText("Next Action", { exact: true }).waitFor({ timeout: 3000 });
    await page.getByText("Achievement Badges", { exact: true }).waitFor({ timeout: 3000 });
    await page.getByText("Claim Goals", { exact: false }).waitFor({ timeout: 3000 });
    await page.getByRole("button", { name: "Run Action" }).click();
    const savedState = await waitForSavedState(
      userDataDir,
      (state) => Array.isArray(state.claimedContracts) && state.claimedContracts.includes("stage-10"),
      "report action save"
    );
    const layoutAudit = await assertLayoutAudit(page, "report-action");
    const screenshotPath = path.join(artifactDir, "packaged-smoke-report-action.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const resourceAudit = await assertLocalOnlyResourceAudit(page, "report-action");
    return {
      userDataDir,
      screenshotPath,
      layoutAudit,
      resourceAudit,
      claimedContracts: savedState.claimedContracts,
      gold: savedState.gold,
      parts: savedState.parts,
      relics: savedState.relics,
      essence: savedState.essence,
      levelPoints: savedState.levelPoints
    };
  } finally {
    await app.close();
  }
}

async function runSaveExportSmoke() {
  const userDataDir = path.join(artifactDir, "user-data-export");
  const exportedPath = path.join(artifactDir, "exported-save-smoke.json");
  const diagnosticsPath = path.join(artifactDir, "diagnostics-smoke.json");
  await resetDirectory(userDataDir);
  await writeFile(path.join(userDataDir, "save.json"), JSON.stringify(createExportSmokeSave(), null, 2), "utf8");

  const app = await launchWithUserData(userDataDir);
  try {
    const page = await firstReadyWindow(app);
    await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
    await page.getByText("22/120").waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("button", { name: "Export Save" }).waitFor({ timeout: 3000 });

    const downloadPromise = page.waitForEvent("download", { timeout: 5000 });
    await page.getByRole("button", { name: "Export Save" }).click();
    const download = await downloadPromise;
    await download.saveAs(exportedPath);
    await page.getByLabel("Save status: Save exported").waitFor({ timeout: 5000 });

    const envelope = JSON.parse(await readFile(exportedPath, "utf8"));
    if (download.suggestedFilename() !== "afk-hero-save-stage-22.json") {
      throw new Error(`Unexpected export filename: ${download.suggestedFilename()}`);
    }
    if (
      envelope.kind !== "afk-hero-save-export" ||
      envelope.version !== 1 ||
      envelope.state?.version !== 1 ||
      envelope.state?.highestStage !== 22 ||
      envelope.checksum !== createSaveChecksum(envelope.state)
    ) {
      throw new Error(`Exported save envelope failed validation: ${JSON.stringify(envelope).slice(0, 500)}`);
    }

    const diagnosticsDownloadPromise = page.waitForEvent("download", { timeout: 5000 });
    await page.getByRole("button", { name: "Export Diagnostics" }).click();
    const diagnosticsDownload = await diagnosticsDownloadPromise;
    await diagnosticsDownload.saveAs(diagnosticsPath);
    await page.getByLabel("Save status: Diagnostics exported").waitFor({ timeout: 5000 });

    const diagnostics = JSON.parse(await readFile(diagnosticsPath, "utf8"));
    if (diagnosticsDownload.suggestedFilename() !== "afk-hero-diagnostics-stage-22.json") {
      throw new Error(`Unexpected diagnostics filename: ${diagnosticsDownload.suggestedFilename()}`);
    }
    if (
      diagnostics.kind !== "afk-hero-diagnostics" ||
      diagnostics.version !== 1 ||
      diagnostics.build?.bundleId !== builderConfig.appId ||
      diagnostics.progression?.highestStage !== 22 ||
      diagnostics.settings?.displayMode !== "windowed" ||
      diagnostics.settings?.windowSettings?.alwaysOnTop !== false ||
      diagnostics.settings?.windowSettings?.compactMode !== false
    ) {
      throw new Error(`Diagnostics export failed validation: ${JSON.stringify(diagnostics).slice(0, 500)}`);
    }

    const layoutAudit = await assertLayoutAudit(page, "save-export");
    const screenshotPath = path.join(artifactDir, "packaged-smoke-save-export.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const resourceAudit = await assertLocalOnlyResourceAudit(page, "save-export");
    const bodyText = await page.locator("body").innerText();
    return {
      userDataDir,
      exportedPath,
      diagnosticsPath,
      screenshotPath,
      suggestedFilename: download.suggestedFilename(),
      diagnosticsFilename: diagnosticsDownload.suggestedFilename(),
      checksum: envelope.checksum,
      layoutAudit,
      resourceAudit,
      bodyTextSample: bodyText.slice(0, 240)
    };
  } finally {
    await app.close();
  }
}

async function runSkillRespecSmoke() {
  const userDataDir = path.join(artifactDir, "user-data-skill-respec");
  await resetDirectory(userDataDir);
  await writeFile(path.join(userDataDir, "save.json"), JSON.stringify(createSkillRespecSave(), null, 2), "utf8");

  const app = await launchWithUserData(userDataDir);
  try {
    const page = await firstReadyWindow(app);
    await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
    await page.getByRole("tab", { name: "Skills" }).click();
    await page.getByRole("button", { name: "Respec Skills" }).click();
    await page.getByText("Refund 0 relics", { exact: false }).waitFor({ timeout: 3000 });
    const savedState = await waitForSavedState(
      userDataDir,
      (state) =>
        state.skills?.cleave === 0 &&
        state.skills?.treasury === 0 &&
        state.skills?.pressure === 0 &&
        state.levelPoints >= 4,
      "skill respec save"
    );
    const layoutAudit = await assertLayoutAudit(page, "skill-respec");
    const screenshotPath = path.join(artifactDir, "packaged-smoke-skill-respec.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const resourceAudit = await assertLocalOnlyResourceAudit(page, "skill-respec");
    return {
      userDataDir,
      screenshotPath,
      layoutAudit,
      resourceAudit,
      skills: savedState.skills,
      relics: savedState.relics,
      essence: savedState.essence,
      levelPoints: savedState.levelPoints
    };
  } finally {
    await app.close();
  }
}

async function runSkillCapSmoke() {
  const userDataDir = path.join(artifactDir, "user-data-skill-cap");
  await resetDirectory(userDataDir);
  await writeFile(path.join(userDataDir, "save.json"), JSON.stringify(createSkillCapSave(), null, 2), "utf8");

  const app = await launchWithUserData(userDataDir);
  try {
    const page = await firstReadyWindow(app);
    await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
    await page.getByRole("tab", { name: "Skills" }).click();
    const cleaveRow = page.locator(".upgrade-row", { hasText: "Cleave Protocol" });
    await cleaveRow.getByRole("button", { name: "Max" }).waitFor({ timeout: 3000 });
    await cleaveRow.getByText("Max rank", { exact: true }).waitFor({ timeout: 3000 });
    const layoutAudit = await assertLayoutAudit(page, "skill-cap");
    const screenshotPath = path.join(artifactDir, "packaged-smoke-skill-cap.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const resourceAudit = await assertLocalOnlyResourceAudit(page, "skill-cap");
    return {
      userDataDir,
      screenshotPath,
      layoutAudit,
      resourceAudit,
      cappedSkill: "cleave"
    };
  } finally {
    await app.close();
  }
}

async function runInvalidSaveImportSmoke() {
  const userDataDir = path.join(artifactDir, "user-data-invalid-import");
  const importPath = path.join(artifactDir, "invalid-import-save.json");
  await resetDirectory(userDataDir);
  await writeFile(path.join(userDataDir, "save.json"), JSON.stringify(createBossVisualSave(), null, 2), "utf8");
  await writeFile(importPath, JSON.stringify(createTamperedSaveExport(createRecoverySave()), null, 2), "utf8");

  const app = await launchWithUserData(userDataDir);
  try {
    const page = await firstReadyWindow(app);
    await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
    await page.getByText("10/120").waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("button", { name: "Import Save" }).waitFor({ timeout: 3000 });
    await page.getByLabel("Import save file").setInputFiles(importPath);
    await page.getByLabel("Save status: Import failed").waitFor({ timeout: 5000 });
    const layoutAudit = await assertLayoutAudit(page, "invalid-save-import");

    const screenshotPath = path.join(artifactDir, "packaged-smoke-invalid-save-import.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    await page.getByRole("button", { name: "Return" }).click();
    await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
    await page.getByText("10/120").waitFor({ timeout: 5000 });
    const resourceAudit = await assertLocalOnlyResourceAudit(page, "invalid-save-import");
    const bodyText = await page.locator("body").innerText();
    if (bodyText.includes("22/120")) {
      throw new Error("Invalid import applied imported progression instead of preserving the current save");
    }
    return {
      userDataDir,
      importPath,
      screenshotPath,
      layoutAudit,
      resourceAudit,
      bodyTextSample: bodyText.slice(0, 240)
    };
  } finally {
    await app.close();
  }
}

async function runResetConfirmationSmoke() {
  const userDataDir = path.join(artifactDir, "user-data-reset-confirmation");
  await resetDirectory(userDataDir);
  await writeFile(path.join(userDataDir, "save.json"), JSON.stringify(createRecoverySave(), null, 2), "utf8");

  const app = await launchWithUserData(userDataDir);
  try {
    const page = await firstReadyWindow(app);
    await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
    await page.getByText("22/120").waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: "New Run" }).click();
    await page.getByRole("button", { name: "Confirm New Run" }).waitFor({ timeout: 3000 });
    await page.getByText("22/120").waitFor({ timeout: 5000 });
    const confirmLayout = await assertLayoutAudit(page, "reset-confirmation-armed");
    await page.getByRole("button", { name: "Confirm New Run" }).click();
    await page.getByRole("button", { name: "Start" }).waitFor({ timeout: 7000 });
    await page.getByText("Best Stage").waitFor({ timeout: 3000 });
    const titleLayout = await assertLayoutAudit(page, "reset-confirmation-title");

    const savedState = JSON.parse(await readFile(path.join(userDataDir, "save.json"), "utf8"));
    if (savedState.stage !== 1 || savedState.highestStage !== 1 || savedState.introSeen !== false) {
      throw new Error(`Reset did not write a fresh save: ${JSON.stringify(savedState).slice(0, 500)}`);
    }

    const screenshotPath = path.join(artifactDir, "packaged-smoke-reset-confirmation.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const resourceAudit = await assertLocalOnlyResourceAudit(page, "reset-confirmation");
    const bodyText = await page.locator("body").innerText();
    return {
      userDataDir,
      screenshotPath,
      layoutAudit: [confirmLayout, titleLayout],
      resourceAudit,
      savedState: {
        stage: savedState.stage,
        highestStage: savedState.highestStage,
        introSeen: savedState.introSeen
      },
      bodyTextSample: bodyText.slice(0, 240)
    };
  } finally {
    await app.close();
  }
}

async function runBossStorySmoke() {
  const userDataDir = path.join(artifactDir, "user-data-boss");
  await resetDirectory(userDataDir);
  await writeFile(path.join(userDataDir, "save.json"), JSON.stringify(createBossReadySave(), null, 2), "utf8");

  const app = await launchWithUserData(userDataDir);
  try {
    const page = await firstReadyWindow(app);
    await page.getByText("Boiler Regent Defeated").waitFor({ timeout: 8000 });
    await page.locator('.story-art[data-story-art="boss"] img').waitFor({ timeout: 3000 });
    const storyLayout = await assertLayoutAudit(page, "boss-story");
    await page.getByRole("button", { name: "Return to the Forge" }).click();
    await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
    const gameLayout = await assertLayoutAudit(page, "boss-story-return");

    const screenshotPath = path.join(artifactDir, "packaged-smoke-boss-story.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const resourceAudit = await assertLocalOnlyResourceAudit(page, "boss-story");
    const bodyText = await page.locator("body").innerText();
    return {
      userDataDir,
      screenshotPath,
      layoutAudit: [storyLayout, gameLayout],
      resourceAudit,
      bodyTextSample: bodyText.slice(0, 240)
    };
  } finally {
    await app.close();
  }
}

async function runMapTravelSmoke() {
  const userDataDir = path.join(artifactDir, "user-data-map-travel");
  await resetDirectory(userDataDir);
  await writeFile(path.join(userDataDir, "save.json"), JSON.stringify(createMapTravelSave(), null, 2), "utf8");

  const app = await launchWithUserData(userDataDir);
  try {
    const page = await firstReadyWindow(app);
    await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
    await page.getByRole("tab", { name: "Map" }).click();
    await page.locator(".map-row.unlocked").filter({ hasText: "Boiler Docks" }).getByRole("button", { name: "Travel" }).click();
    const savedState = await waitForSavedState(
      userDataDir,
      (state) =>
        state.stage === 21 &&
        state.zone === 3 &&
        state.highestStage === 45 &&
        state.runLog?.[0]?.kind === "travel",
      "map region travel"
    );
    await page.locator(".map-list strong", { hasText: "Boiler Docks" }).waitFor({ timeout: 3000 });
    await page.getByLabel("Challenge Tower").waitFor({ timeout: 3000 });
    await page.getByText("Brassworks Pressure Trial", { exact: true }).waitFor({ timeout: 3000 });
    await page.getByRole("tab", { name: "Report" }).click();
    await page.getByLabel("Recent Activity").waitFor({ timeout: 3000 });
    await page.getByText("Traveled to Boiler Docks", { exact: true }).waitFor({ timeout: 3000 });
    const mapLayout = await assertLayoutAudit(page, "map-travel");
    const screenshotPath = path.join(artifactDir, "packaged-smoke-map-travel.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const resourceAudit = await assertLocalOnlyResourceAudit(page, "map-travel");
    return {
      userDataDir,
      screenshotPath,
      layoutAudit: mapLayout,
      resourceAudit,
      savedState: {
        stage: savedState.stage,
        zone: savedState.zone,
        highestStage: savedState.highestStage,
        enemySeed: savedState.enemySeed,
        runLog: savedState.runLog?.slice(0, 2)
      }
    };
  } finally {
    await app.close();
  }
}

async function runCampaignClearSmoke() {
  const userDataDir = path.join(artifactDir, "user-data-campaign-clear");
  await resetDirectory(userDataDir);
  await writeFile(path.join(userDataDir, "save.json"), JSON.stringify(createCampaignClearSave(), null, 2), "utf8");

  const app = await launchWithUserData(userDataDir);
  try {
    const page = await firstReadyWindow(app);
    await page.getByText("A New City Engine").waitFor({ timeout: 8000 });
    await page.locator('.story-art[data-story-art="boss"] img').waitFor({ timeout: 3000 });
    const storyLayout = await assertLayoutAudit(page, "campaign-clear-story");
    await page.getByRole("button", { name: "Return to the Forge" }).click();
    await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
    await page.getByText("Route Complete").waitFor({ timeout: 5000 });
    await page.waitForTimeout(1800);
    const savedState = JSON.parse(await readFile(path.join(userDataDir, "save.json"), "utf8"));
    if (savedState.campaignCleared !== true || savedState.bossesDefeated !== 12 || savedState.pendingBossStory !== undefined) {
      throw new Error(`Campaign clear did not persist expected state: ${JSON.stringify({
        campaignCleared: savedState.campaignCleared,
        bossesDefeated: savedState.bossesDefeated,
        pendingBossStory: savedState.pendingBossStory
      })}`);
    }
    const gameLayout = await assertLayoutAudit(page, "campaign-clear-return");
    const screenshotPath = path.join(artifactDir, "packaged-smoke-campaign-clear.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const resourceAudit = await assertLocalOnlyResourceAudit(page, "campaign-clear");
    const bodyText = await page.locator("body").innerText();
    return {
      userDataDir,
      screenshotPath,
      layoutAudit: [storyLayout, gameLayout],
      resourceAudit,
      savedState: {
        campaignCleared: savedState.campaignCleared,
        bossesDefeated: savedState.bossesDefeated,
        stage: savedState.stage,
        highestStage: savedState.highestStage
      },
      bodyTextSample: bodyText.slice(0, 260)
    };
  } finally {
    await app.close();
  }
}

async function launchWithUserData(userDataDir) {
  return electron.launch({
    executablePath,
    acceptDownloads: true,
    env: {
      ...process.env,
      AFK_HERO_USER_DATA_DIR: userDataDir,
      ELECTRON_ENABLE_LOGGING: "1"
    }
  });
}

async function firstReadyWindow(app) {
  const page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1200);
  return page;
}

async function expectText(page, expected) {
  const bodyText = await page.locator("body").innerText({ timeout: 5000 });
  if (!bodyText.includes(expected)) {
    throw new Error(`Expected page text to include ${expected}`);
  }
}

async function assertLocalOnlyResourceAudit(page, label) {
  const audit = await page.evaluate((auditLabel) => {
    const entries = performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter(Boolean);
    const urls = [window.location.href, ...entries];
    const externalUrls = urls.filter((url) => /^https?:\/\//i.test(url));
    const schemes = [...new Set(urls.map((url) => url.split(":")[0]).filter(Boolean))].sort();
    return {
      label: auditLabel,
      ok: externalUrls.length === 0,
      checkedUrlCount: urls.length,
      schemes,
      externalUrls
    };
  }, label);

  if (!audit.ok) {
    throw new Error(`External packaged resources loaded for ${label}: ${JSON.stringify(audit.externalUrls)}`);
  }

  return audit;
}

async function assertLayoutAudit(page, label) {
  const audit = await page.evaluate((auditLabel) => {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      documentScrollWidth: document.documentElement.scrollWidth,
      documentScrollHeight: document.documentElement.scrollHeight,
      bodyScrollWidth: document.body.scrollWidth,
      bodyScrollHeight: document.body.scrollHeight
    };
    const problems = [];
    const tolerance = 24;

    if (viewport.documentScrollWidth > viewport.width + tolerance || viewport.bodyScrollWidth > viewport.width + tolerance) {
      problems.push(`horizontal document overflow ${viewport.documentScrollWidth}/${viewport.bodyScrollWidth} > ${viewport.width}`);
    }

    const requiredSelectors = [
      ".aspect-shell",
      ".app-shell",
      ".topbar",
      ".game-layout",
      ".battle-panel",
      ".upgrade-panel",
      ".title-screen",
      ".story-screen",
      ".settings-screen",
      ".settings-panel"
    ];
    const visibleRects = [];

    for (const selector of requiredSelectors) {
      for (const element of document.querySelectorAll(selector)) {
        const rect = element.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) {
          continue;
        }
        visibleRects.push({
          selector,
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        });
        if (
          rect.left < -tolerance ||
          rect.top < -tolerance ||
          rect.right > viewport.width + tolerance ||
          rect.bottom > viewport.height + tolerance
        ) {
          problems.push(`${selector} outside viewport ${JSON.stringify(visibleRects.at(-1))}`);
        }
      }
    }

    const clippedButtons = [];
    for (const button of document.querySelectorAll("button")) {
      const rect = button.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) {
        continue;
      }
      if (button.scrollWidth > button.clientWidth + tolerance || button.scrollHeight > button.clientHeight + tolerance) {
        clippedButtons.push({
          text: button.textContent?.trim().replace(/\s+/g, " ").slice(0, 48) ?? "",
          clientWidth: button.clientWidth,
          scrollWidth: button.scrollWidth,
          clientHeight: button.clientHeight,
          scrollHeight: button.scrollHeight
        });
      }
    }

    if (clippedButtons.length > 0) {
      problems.push(`button content clipped ${JSON.stringify(clippedButtons.slice(0, 4))}`);
    }

    return {
      label: auditLabel,
      ok: problems.length === 0,
      viewport,
      visibleRects,
      clippedButtons,
      problems
    };
  }, label);

  if (!audit.ok) {
    throw new Error(`Layout audit failed for ${label}: ${JSON.stringify(audit.problems)}`);
  }

  return audit;
}

async function exerciseAudioSettings(page) {
  await page.getByRole("button", { name: "Sound Off" }).click();
  await page.getByLabel("Sound volume").evaluate((input) => {
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setValue?.call(input, "65");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForFunction(() => {
    const stored = localStorage.getItem("afk-hero-audio-settings-v1");
    if (!stored) {
      return false;
    }
    const parsed = JSON.parse(stored);
    return parsed.enabled === false && parsed.volume === 0.65;
  });

  const stored = await page.evaluate(() => localStorage.getItem("afk-hero-audio-settings-v1"));
  const parsed = JSON.parse(stored ?? "{}");
  if (parsed.enabled !== false || parsed.volume !== 0.65) {
    throw new Error(`Expected persisted audio settings off at 65%, received ${stored}`);
  }

  await page.getByRole("button", { name: "Sound On" }).click();
  return {
    disabledAt65: parsed,
    restored: await page.evaluate(() => JSON.parse(localStorage.getItem("afk-hero-audio-settings-v1") ?? "{}"))
  };
}

async function exerciseRuntimeSettings(page) {
  await page.getByRole("button", { name: "Low Power" }).click();
  await page.getByRole("button", { name: "2x" }).click();
  await page.waitForFunction(() => {
    const stored = localStorage.getItem("afk-hero-runtime-settings-v1");
    if (!stored) {
      return false;
    }
    const parsed = JSON.parse(stored);
    return parsed.lowPower === true && parsed.battleSpeed === 2;
  });

  const stored = await page.evaluate(() => localStorage.getItem("afk-hero-runtime-settings-v1"));
  const parsed = JSON.parse(stored ?? "{}");
  if (parsed.lowPower !== true || parsed.battleSpeed !== 2) {
    throw new Error(`Expected persisted runtime settings, received ${stored}`);
  }

  await page.getByRole("button", { name: "Full Rate" }).click();
  await page.getByRole("button", { name: "1x" }).click();
  return {
    runtime: parsed,
    restored: await page.evaluate(() => JSON.parse(localStorage.getItem("afk-hero-runtime-settings-v1") ?? "{}"))
  };
}

async function exerciseWindowSettings(page) {
  await page.getByRole("button", { name: "Keep On Top" }).click();
  const enabled = await waitForDisplayState(page, "always-on-top-enabled", (state) => {
    return state.window.isAlwaysOnTop === true;
  });
  await page.waitForFunction(() => {
    const stored = localStorage.getItem("afk-hero-window-settings-v1");
    if (!stored) {
      return false;
    }
    return JSON.parse(stored).alwaysOnTop === true;
  });

  const storedEnabled = await page.evaluate(() => JSON.parse(localStorage.getItem("afk-hero-window-settings-v1") ?? "{}"));
  if (storedEnabled.alwaysOnTop !== true) {
    throw new Error(`Expected persisted always-on-top setting, received ${JSON.stringify(storedEnabled)}`);
  }

  await page.getByRole("button", { name: "Normal Stack" }).click();
  const disabled = await waitForDisplayState(page, "always-on-top-disabled", (state) => {
    return state.window.isAlwaysOnTop === false;
  });
  await page.waitForFunction(() => {
    const stored = localStorage.getItem("afk-hero-window-settings-v1");
    if (!stored) {
      return false;
    }
    return JSON.parse(stored).alwaysOnTop === false;
  });

  return {
    enabled,
    disabled,
    restored: await page.evaluate(() => JSON.parse(localStorage.getItem("afk-hero-window-settings-v1") ?? "{}"))
  };
}

async function exerciseCompactMode(page) {
  await page.getByRole("button", { name: "Compact" }).click();
  const compactWindow = await waitForDisplayState(page, "compact-window", (state) => {
    return (
      !state.window.isFullScreen &&
      !state.window.isSimpleFullScreen &&
      state.window.width <= 1000 &&
      state.window.height <= 570 &&
      Math.abs(state.window.aspectRatio - 16 / 9) < 0.02
    );
  });
  await page.waitForFunction(() => {
    const stored = localStorage.getItem("afk-hero-window-settings-v1");
    if (!stored) {
      return false;
    }
    return JSON.parse(stored).compactMode === true;
  });
  await page.getByRole("button", { name: "Return" }).click();
  await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
  await page.locator(".aspect-shell.compact-mode").waitFor({ timeout: 3000 });
  const compactLayout = await assertLayoutAudit(page, "compact-game");

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Standard" }).click();
  const standardWindow = await waitForDisplayState(page, "standard-window", (state) => {
    return (
      !state.window.isFullScreen &&
      !state.window.isSimpleFullScreen &&
      state.window.width >= 1260 &&
      state.window.height >= 700 &&
      Math.abs(state.window.aspectRatio - 16 / 9) < 0.02
    );
  });
  await page.waitForFunction(() => {
    const stored = localStorage.getItem("afk-hero-window-settings-v1");
    if (!stored) {
      return false;
    }
    return JSON.parse(stored).compactMode === false;
  });
  await page.locator(".aspect-shell.compact-mode").waitFor({ state: "detached", timeout: 3000 });
  return {
    compactWindow,
    compactLayout,
    standardWindow,
    restored: await page.evaluate(() => JSON.parse(localStorage.getItem("afk-hero-window-settings-v1") ?? "{}"))
  };
}

async function exerciseKeyboardNavigation(page) {
  await page.keyboard.press("1");
  await page.getByRole("tab", { selected: true }).filter({ hasText: "Forge" }).waitFor({ timeout: 3000 });

  await page.keyboard.press("2");
  await page.getByRole("tab", { selected: true }).filter({ hasText: "Skills" }).waitFor({ timeout: 3000 });
  const skillsLayout = await assertLayoutAudit(page, "keyboard-skills");

  await page.keyboard.press("3");
  await page.getByRole("tab", { selected: true }).filter({ hasText: "Goals" }).waitFor({ timeout: 3000 });
  await page.getByText("Brassworks Breakthrough", { exact: true }).waitFor({ timeout: 3000 });
  const goalsLayout = await assertLayoutAudit(page, "keyboard-goals");

  await page.keyboard.press("4");
  await page.getByRole("tab", { selected: true }).filter({ hasText: "Map" }).waitFor({ timeout: 3000 });
  await page.locator(".map-list strong", { hasText: "Brassworks Alley" }).waitFor({ timeout: 3000 });
  const mapLayout = await assertLayoutAudit(page, "keyboard-map");

  await page.keyboard.press("5");
  await page.getByRole("tab", { selected: true }).filter({ hasText: "Loot" }).waitFor({ timeout: 3000 });
  const lootLayout = await assertLayoutAudit(page, "keyboard-loot");

  await page.keyboard.press("6");
  await page.getByRole("tab", { selected: true }).filter({ hasText: "Report" }).waitFor({ timeout: 3000 });
  await page.getByLabel("Run Report").waitFor({ timeout: 3000 });
  await page.getByLabel("Achievement badges").waitFor({ timeout: 3000 });
  const reportLayout = await assertLayoutAudit(page, "keyboard-report");

  await page.keyboard.press("1");
  await page.getByRole("tab", { selected: true }).filter({ hasText: "Forge" }).waitFor({ timeout: 3000 });
  const gearLayout = await assertLayoutAudit(page, "keyboard-gear");

  await page.keyboard.press("f");
  await page.locator(".battle-plan button.active", { hasText: "Farm" }).waitFor({ timeout: 3000 });
  await page.keyboard.press("h");
  await page.locator(".battle-plan button.active", { hasText: "Hold" }).waitFor({ timeout: 3000 });
  await page.keyboard.press("p");
  await page.locator(".battle-plan button.active", { hasText: "Push" }).waitFor({ timeout: 3000 });
  await page.keyboard.press("r");
  await page.getByRole("button", { name: "Retry Stage" }).waitFor({ timeout: 3000 });
  const battleShortcutLayout = await assertLayoutAudit(page, "keyboard-battle-shortcuts");

  await page.keyboard.press("s");
  await page.getByRole("button", { name: "Windowed" }).waitFor({ timeout: 3000 });
  const settingsLayout = await assertLayoutAudit(page, "keyboard-settings");
  await page.keyboard.press("Escape");
  await page.getByLabel("AFK HERO battle scene").waitFor({ timeout: 7000 });
  await page.getByRole("tab", { selected: true }).filter({ hasText: "Forge" }).waitFor({ timeout: 3000 });
  const returnLayout = await assertLayoutAudit(page, "keyboard-return");

  return {
    shortcuts: ["1", "2", "3", "4", "5", "6", "1", "f", "h", "p", "r", "s", "Escape"],
    layoutAudit: [
      skillsLayout,
      goalsLayout,
      mapLayout,
      lootLayout,
      reportLayout,
      gearLayout,
      battleShortcutLayout,
      settingsLayout,
      returnLayout
    ]
  };
}

async function exerciseDisplayModes(app, page) {
  const initial = await readDisplaySnapshot(page);

  await page.getByRole("button", { name: "Borderless" }).click();
  const borderless = await waitForDisplayState(page, "borderless", (state) => {
    return state.window.isSimpleFullScreen || state.window.isMaximized || state.window.isFullScreen;
  });

  await page.getByRole("button", { name: "Fullscreen" }).click();
  const fullscreen = await waitForDisplayState(
    page,
    "fullscreen",
    (state) => state.window.isFullScreen || state.window.isSimpleFullScreen
  );

  await page.getByRole("button", { name: "Windowed" }).click();
  const windowed = await waitForDisplayState(page, "windowed", (state) => {
    return (
      !state.window.isFullScreen &&
      !state.window.isSimpleFullScreen &&
      Math.abs(state.window.aspectRatio - 16 / 9) < 0.02
    );
  });
  const manualResize = await exerciseManualResize(app, page);

  const persistedMode = await page.evaluate(() => localStorage.getItem("afk-hero-display-mode-v1"));
  if (persistedMode !== "windowed") {
    throw new Error(`Expected persisted display mode to be windowed, received ${persistedMode}`);
  }

  return {
    initial,
    borderless,
    fullscreen,
    windowed,
    manualResize,
    persistedMode
  };
}

async function exerciseManualResize(app, page) {
  const browserWindow = await app.browserWindow(page);
  await browserWindow.evaluate((window) => {
    if (process.platform === "darwin" && typeof window.setSimpleFullScreen === "function") {
      window.setSimpleFullScreen(false);
    }
    window.setFullScreen(false);
    window.unmaximize();
    window.setAspectRatio(16 / 9);
    window.setSize(1111, 777, true);
    window.center();
  });

  const resized = await waitForDisplayState(page, "manual-resize", (state) => {
    return (
      !state.window.isFullScreen &&
      !state.window.isSimpleFullScreen &&
      Math.abs(state.shell.aspectRatio - 16 / 9) < 0.02
    );
  });
  const resizedLayout = await assertLayoutAudit(page, "manual-resize");

  await browserWindow.evaluate((window) => {
    window.setSize(1280, 720, true);
    window.center();
  });

  const restored = await waitForDisplayState(page, "manual-resize-restore", (state) => {
    return (
      !state.window.isFullScreen &&
      !state.window.isSimpleFullScreen &&
      Math.abs(state.window.aspectRatio - 16 / 9) < 0.02 &&
      Math.abs(state.shell.aspectRatio - 16 / 9) < 0.02
    );
  });

  return {
    requested: { width: 1111, height: 777 },
    resized,
    resizedLayout,
    restored
  };
}

async function waitForDisplayState(page, label, predicate) {
  let lastState;
  for (let attempt = 0; attempt < 28; attempt += 1) {
    lastState = await readDisplaySnapshot(page);
    if (predicate(lastState)) {
      assertShellAspect(lastState.shell, label);
      return lastState;
    }
    await page.waitForTimeout(250);
  }
  throw new Error(`Timed out waiting for ${label} display state: ${JSON.stringify(lastState)}`);
}

async function readDisplayState(page) {
  const result = await page.evaluate(() => window.afkHeroWindow?.getDisplayState());
  if (!result?.ok || !result.state) {
    throw new Error("Display state IPC is unavailable");
  }
  return result.state;
}

async function readDisplaySnapshot(page) {
  const windowState = await readDisplayState(page);
  const shellState = await page.locator(".aspect-shell").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      aspectRatio: rect.width / rect.height
    };
  });
  assertShellAspect(shellState, "initial");
  return {
    window: windowState,
    shell: shellState
  };
}

function assertShellAspect(shellState, label) {
  if (Math.abs(shellState.aspectRatio - 16 / 9) > 0.02) {
    throw new Error(`Aspect shell ratio drifted in ${label}: ${JSON.stringify(shellState)}`);
  }
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

async function waitForSavedState(userDataDir, predicate, label) {
  const savePath = path.join(userDataDir, "save.json");
  let lastState = null;
  const startedAt = Date.now();
  while (Date.now() - startedAt < 5000) {
    try {
      lastState = JSON.parse(await readFile(savePath, "utf8"));
      if (predicate(lastState)) {
        return lastState;
      }
    } catch {
      // Save may not exist yet during first write.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}: ${JSON.stringify(lastState).slice(0, 500)}`);
}

async function resetDirectory(dir) {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
}

function createSaveExport(state) {
  return {
    kind: "afk-hero-save-export",
    version: 1,
    exportedAt: state.lastSavedAt,
    checksum: createSaveChecksum(state),
    state
  };
}

function createTamperedSaveExport(state) {
  return {
    ...createSaveExport(state),
    checksum: "00000000"
  };
}

function createSaveChecksum(state) {
  let hash = 0x811c9dc5;
  const source = stableStringify(state);
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  return `{${Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

function createBossReadySave() {
  return {
    version: 1,
    heroName: "Ari",
    level: 20,
    xp: 0,
    levelPoints: 19,
    gold: 6000,
    relics: 0,
    parts: 220,
    essence: 0,
    stage: 10,
    zone: 1,
    highestStage: 10,
    heroHp: 900,
    enemyHp: 1,
    enemySeed: 0,
    overdrive: 100,
    gear: {
      blade: 12,
      armor: 8,
      banner: 5,
      goggles: 3,
      engine: 3
    },
    skills: {
      cleave: 2,
      bulwark: 2,
      treasury: 1,
      pressure: 1,
      salvage: 1
    },
    claimedContracts: [],
    battlePlan: "push",
    campaignCleared: false,
    runLog: [],
    autoSellRarities: [],
    inventory: [],
    equipped: {
      blade: null,
      armor: null,
      banner: null,
      goggles: null,
      engine: null
    },
    kills: 0,
    bossesDefeated: 0,
    totalGold: 6000,
    introSeen: true,
    seenBossStories: [],
    lastSavedAt: Date.now()
  };
}

function createBossVisualSave() {
  return {
    ...createBossReadySave(),
    level: 3,
    levelPoints: 2,
    gold: 200,
    relics: 0,
    parts: 15,
    essence: 0,
    heroHp: 300,
    enemyHp: 12000,
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
    totalGold: 200,
    lastSavedAt: Date.now()
  };
}

function createCampaignClearSave() {
  return {
    ...createBossReadySave(),
    level: 80,
    xp: 0,
    levelPoints: 79,
    gold: 140000,
    relics: 24,
    parts: 1800,
    essence: 18,
    stage: 120,
    zone: 12,
    highestStage: 120,
    heroHp: 5200,
    enemyHp: 1,
    enemySeed: 8,
    overdrive: 100,
    gear: {
      blade: 48,
      armor: 48,
      banner: 24,
      goggles: 24,
      engine: 24
    },
    skills: {
      cleave: 5,
      bulwark: 5,
      treasury: 5,
      pressure: 5,
      salvage: 5
    },
    kills: 620,
    bossesDefeated: 11,
    totalGold: 440000,
    campaignCleared: false,
    seenBossStories: Array.from({ length: 11 }, (_value, index) => index + 1),
    pendingBossStory: undefined,
    lastSavedAt: Date.now()
  };
}

function createRetryStageSave() {
  return {
    ...createBossVisualSave(),
    heroHp: 120,
    enemyHp: 500,
    enemySeed: 7,
    overdrive: 45,
    lastSavedAt: Date.now()
  };
}

function createMapTravelSave() {
  return {
    ...createRecoverySave(),
    stage: 37,
    zone: 4,
    highestStage: 45,
    heroHp: 80,
    enemyHp: 2400,
    enemySeed: 14,
    overdrive: 145,
    battlePlan: "push",
    lastSavedAt: Date.now()
  };
}

function createRecoverySave() {
  return {
    ...createBossReadySave(),
    level: 12,
    xp: 80,
    levelPoints: 11,
    gold: 1800,
    parts: 90,
    essence: 1,
    stage: 22,
    zone: 3,
    highestStage: 22,
    heroHp: 420,
    enemyHp: 850,
    overdrive: 20,
    bossesDefeated: 2,
    seenBossStories: [1, 2],
    pendingBossStory: undefined,
    lastSavedAt: Date.now()
  };
}

function createRestoreBackupCurrentSave() {
  return {
    ...createRecoverySave(),
    level: 4,
    levelPoints: 3,
    gold: 180,
    parts: 8,
    essence: 0,
    stage: 5,
    zone: 1,
    highestStage: 5,
    heroHp: 220,
    enemyHp: 300,
    overdrive: 0,
    bossesDefeated: 0,
    seenBossStories: [],
    pendingBossStory: undefined,
    lastSavedAt: Date.now()
  };
}

function createOfflineRewardSave() {
  return {
    ...createRecoverySave(),
    stage: 18,
    zone: 2,
    highestStage: 18,
    heroHp: 520,
    enemyHp: 900,
    lastOfflineReward: undefined,
    lastSavedAt: Date.now() - 10 * 60 * 60 * 1000
  };
}

function createShortOfflineRewardSave() {
  return {
    ...createRecoverySave(),
    stage: 14,
    zone: 2,
    highestStage: 14,
    heroHp: 500,
    enemyHp: 620,
    battlePlan: "farm",
    lastOfflineReward: undefined,
    lastSavedAt: Date.now() - 6 * 60 * 1000
  };
}

function createLootEquipBestSave() {
  return {
    ...createRecoverySave(),
    inventory: [
      {
        id: "loot-weak-blade",
        slot: "blade",
        rarity: "common",
        level: 8,
        power: 14,
        name: "Common Starforged Blade",
        droppedAtStage: 8
      },
      {
        id: "loot-strong-blade",
        slot: "blade",
        rarity: "epic",
        level: 22,
        power: 74,
        name: "Epic Starforged Blade",
        droppedAtStage: 22
      },
      {
        id: "loot-armor",
        slot: "armor",
        rarity: "rare",
        level: 21,
        power: 58,
        name: "Rare Dawnplate Armor",
        droppedAtStage: 21
      },
      {
        id: "loot-locked-goggles",
        slot: "goggles",
        rarity: "common",
        level: 18,
        power: 30,
        name: "Common Aether Goggles",
        droppedAtStage: 18
      }
    ],
    equipped: {
      blade: "loot-weak-blade",
      armor: null,
      banner: null,
      goggles: null,
      engine: null
    },
    lastSavedAt: Date.now()
  };
}

function createAutoSellLootSave() {
  return {
    ...createRecoverySave(),
    stage: 1,
    zone: 1,
    highestStage: 1,
    level: 4,
    levelPoints: 3,
    gold: 0,
    parts: 0,
    kills: 4,
    enemySeed: 3,
    heroHp: 600,
    enemyHp: 1,
    overdrive: 100,
    battlePlan: "push",
    autoSellRarities: ["common"],
    inventory: [
      {
        id: "auto-keep-goggles",
        slot: "goggles",
        rarity: "rare",
        level: 12,
        power: 200,
        name: "Rare Aether Goggles",
        droppedAtStage: 12
      }
    ],
    equipped: {
      blade: null,
      armor: null,
      banner: null,
      goggles: null,
      engine: null
    },
    lastSavedAt: Date.now()
  };
}

function createForgeAllGearSave() {
  return {
    ...createRecoverySave(),
    gold: 420,
    parts: 120,
    essence: 3,
    gear: {
      blade: 1,
      armor: 1,
      banner: 1,
      goggles: 1,
      engine: 1
    },
    lastSavedAt: Date.now()
  };
}

function createClaimAllContractsSave() {
  return {
    ...createRecoverySave(),
    level: 15,
    xp: 0,
    levelPoints: 14,
    gold: 2000,
    relics: 1,
    parts: 120,
    essence: 1,
    stage: 60,
    zone: 6,
    highestStage: 60,
    heroHp: 360,
    enemyHp: 1800,
    kills: 80,
    bossesDefeated: 3,
    totalGold: 18000,
    claimedContracts: [],
    campaignCleared: false,
    battlePlan: "push",
    inventory: Array.from({ length: 8 }, (_value, index) => ({
      id: `claim-all-drop-${index}`,
      slot: "blade",
      rarity: "common",
      level: index + 1,
      power: index + 2,
      name: `Common Contract Blade ${index + 1}`,
      droppedAtStage: index + 1
    })),
    equipped: {
      blade: null,
      armor: null,
      banner: null,
      goggles: null,
      engine: null
    },
    lastSavedAt: Date.now()
  };
}

function createSkillRespecSave() {
  return {
    ...createRecoverySave(),
    relics: 2,
    essence: 1,
    levelPoints: 0,
    skills: {
      cleave: 2,
      bulwark: 0,
      treasury: 1,
      pressure: 1,
      salvage: 0
    },
    lastSavedAt: Date.now()
  };
}

function createSkillCapSave() {
  return {
    ...createRecoverySave(),
    relics: 999,
    essence: 999,
    levelPoints: 999,
    skills: {
      cleave: 5,
      bulwark: 0,
      treasury: 0,
      pressure: 0,
      salvage: 0
    },
    lastSavedAt: Date.now()
  };
}

function createExportSmokeSave() {
  return {
    ...createRecoverySave(),
    enemyHp: 999999,
    lastSavedAt: Date.now()
  };
}
