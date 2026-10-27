import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BookOpen,
  CheckCircle2,
  Coins,
  AlertTriangle,
  Download,
  FileText,
  Flame,
  Gauge,
  Gem,
  Map,
  Maximize,
  Monitor,
  Package,
  Play,
  RotateCcw,
  Save,
  ShieldCheck,
  Settings,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Upload,
  Volume2,
  VolumeX,
  Zap
} from "lucide-react";
import { createAudioEngine } from "./audio";
import { appBuildInfo } from "./build-info";
import { serializeDiagnosticsReport } from "./diagnostics";
import {
  ascend,
  createInitialGameState,
  acknowledgeBossStory,
  applyRecommendedRunAction,
  autoSellRarityOptions,
  buyGear,
  buySkill,
  claimAllContracts,
  claimContract,
  craftEquipmentItem,
  deriveAchievements,
  deriveBattleForecast,
  deriveBestiary,
  deriveCraftingPreview,
  deriveChallengeTrials,
  deriveCombatFeedback,
  deriveContracts,
  deriveForgeAllPreview,
  deriveLatestDrop,
  deriveReforgePreview,
  deriveRewardPreview,
  deriveRunReport,
  deriveSkillRefund,
  deriveStats,
  deriveStoryArchive,
  deriveUpgradePreview,
  equipBestItems,
  equipItem,
  forgeAffordableGear,
  gearLabels,
  bossInterval,
  getGearCost,
  getGearPartCost,
  getSkillEssenceCost,
  getSkillCost,
  markIntroSeen,
  maxSkillRank,
  maxStage,
  openingStory,
  rarityLabels,
  regionNames,
  respecSkills,
  retryCurrentStage,
  sellItem,
  sellUnequippedByRarity,
  setBattlePlan,
  skillLabels,
  tick,
  travelToStage,
  toggleAutoSellRarity,
  toggleEquipmentLock,
  type BattlePlan,
  type ContractReward,
  type EquipmentItem,
  type GameState,
  type GearKey,
  type SkillKey,
  type StoryArchiveEntry
} from "./game";
import {
  loadGameState,
  parseImportedGameState,
  resetGameState,
  restoreBackupGameState,
  saveGameState,
  serializeGameStateForExport
} from "./save";
import { getRuntimeCadence } from "./runtime";
import {
  loadAudioSettings,
  loadDisplayMode,
  loadRuntimeSettings,
  loadWindowSettings,
  saveAudioSettings,
  saveDisplayMode,
  saveRuntimeSettings,
  saveWindowSettings
} from "./settings";
import type { AppScreen, AudioSettings, DisplayMode, RuntimeSettings, WindowSettings } from "./types";
import steamworksForgeSrc from "./assets/backgrounds/steamworks-forge.png";
import heroSpriteSrc from "./assets/sprites/afk-hero-steampunk.png";
import enemySpriteSrc from "./assets/sprites/afk-hero-enemy.png";
import enemyAetherDroneSrc from "./assets/sprites/generated/enemy-aether-drone.png";
import enemyCenserGuardSrc from "./assets/sprites/generated/enemy-censer-guard.png";
import enemyFurnaceCrawlerSrc from "./assets/sprites/generated/enemy-furnace-crawler.png";
import enemyScrapDuelistSrc from "./assets/sprites/generated/enemy-scrap-duelist.png";
import enemyVoidRiveterSrc from "./assets/sprites/generated/enemy-void-riveter.png";
import bossSpriteSrc from "./assets/sprites/afk-hero-boss.png";
import bossCathedralFurnaceSrc from "./assets/sprites/generated/boss-cathedral-furnace.png";
import bossClocktowerWardenSrc from "./assets/sprites/generated/boss-clocktower-warden.png";
import bossFoundryColossusSrc from "./assets/sprites/generated/boss-foundry-colossus.png";
import bossHarborGearlordSrc from "./assets/sprites/generated/boss-harbor-gearlord.png";
import bossRailSiegeEngineSrc from "./assets/sprites/generated/boss-rail-siege-engine.png";
import attackFxSpriteSrc from "./assets/sprites/afk-hero-attack-fx.png";

const gearKeys: GearKey[] = ["blade", "armor", "banner", "goggles", "engine"];
const skillKeys: SkillKey[] = ["cleave", "bulwark", "treasury", "pressure", "salvage"];
type PanelKey = "gear" | "skills" | "contracts" | "map" | "loot" | "report";
const panelShortcuts: Record<string, PanelKey> = {
  "1": "gear",
  "2": "skills",
  "3": "contracts",
  "4": "map",
  "5": "loot",
  "6": "report"
};
type SaveStatus = {
  state: "loading" | "saving" | "saved" | "error";
  message: string;
};

type SpriteImages = {
  background: HTMLImageElement;
  hero: HTMLImageElement;
  enemies: HTMLImageElement[];
  bosses: HTMLImageElement[];
  attack: HTMLImageElement;
};

function setNativeSavePending(pending: boolean) {
  void window.afkHeroLifecycle?.setSavePending(pending);
}

export const enemySpriteSources = [
  enemySpriteSrc,
  enemyFurnaceCrawlerSrc,
  enemyAetherDroneSrc,
  enemyCenserGuardSrc,
  enemyScrapDuelistSrc,
  enemyVoidRiveterSrc
];
export const bossSpriteSources = [
  bossSpriteSrc,
  bossHarborGearlordSrc,
  bossRailSiegeEngineSrc,
  bossCathedralFurnaceSrc,
  bossClocktowerWardenSrc,
  bossFoundryColossusSrc
];

export function App() {
  const [state, setState] = useState<GameState>(() => createInitialGameState());
  const [selectedPanel, setSelectedPanel] = useState<PanelKey>("gear");
  const [screen, setScreen] = useState<AppScreen>("title");
  const [openingIndex, setOpeningIndex] = useState(0);
  const [replayStory, setReplayStory] = useState<StoryArchiveEntry | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => loadDisplayMode());
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => loadAudioSettings());
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettings>(() => loadRuntimeSettings());
  const [windowSettings, setWindowSettings] = useState<WindowSettings>(() => loadWindowSettings());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ state: "loading", message: "Loading save" });
  const [resetArmed, setResetArmed] = useState(false);
  const [sprites, setSprites] = useState<SpriteImages | null>(null);
  const stats = useMemo(() => deriveStats(state), [state]);
  const forecast = useMemo(() => deriveBattleForecast(state), [state]);
  const combatFeedback = useMemo(() => deriveCombatFeedback(state), [state]);
  const rewardPreview = useMemo(() => deriveRewardPreview(state), [state]);
  const latestDrop = useMemo(() => deriveLatestDrop(state), [state]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const lastTickRef = useRef(performance.now());
  const saveAllowedRef = useRef(false);
  const savePromiseRef = useRef<Promise<void> | null>(null);
  const replacementInFlightRef = useRef(false);
  const loadGenerationRef = useRef(0);
  const saveInFlightRef = useRef(false);
  const savePendingRef = useRef(false);
  const stateRef = useRef(state);
  const statsRef = useRef(stats);
  const audioSettingsRef = useRef(audioSettings);
  const runtimeSettingsRef = useRef(runtimeSettings);
  const windowSettingsRef = useRef(windowSettings);
  const audioRef = useRef<ReturnType<typeof createAudioEngine> | null>(null);
  const previousAudioStateRef = useRef({
    kills: state.kills,
    bossesDefeated: state.bossesDefeated,
    overdrive: state.overdrive,
    claimedContracts: state.claimedContracts.length
  });
  const screenRef = useRef(screen);
  const runtimeRef = useRef({
    hidden: document.visibilityState === "hidden",
    focused: document.hasFocus()
  });

  const flushSave = useCallback((message = "Saving") => {
    if (!saveAllowedRef.current) return;
    if (saveInFlightRef.current) {
      savePendingRef.current = true;
      setNativeSavePending(true);
      return;
    }
    saveInFlightRef.current = true;
    savePendingRef.current = false;
    setNativeSavePending(true);
    setSaveStatus((current) => (current.state === "error" ? current : { state: "saving", message }));
    savePromiseRef.current = saveGameState(stateRef.current)
      .then(() => {
        setSaveStatus((current) => (current.state === "error" ? current : { state: "saved", message: "Saved" }));
      })
      .catch(() => {
        setSaveStatus({ state: "error", message: "Save failed" });
      })
      .finally(() => {
        savePromiseRef.current = null;
        saveInFlightRef.current = false;
        if (savePendingRef.current) {
          flushSave(message);
          return;
        }
        setNativeSavePending(false);
      });
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  if (!audioRef.current) {
    audioRef.current = createAudioEngine(() => audioSettingsRef.current);
  }

  useEffect(() => {
    audioSettingsRef.current = audioSettings;
  }, [audioSettings]);

  useEffect(() => {
    runtimeSettingsRef.current = runtimeSettings;
  }, [runtimeSettings]);

  useEffect(() => {
    windowSettingsRef.current = windowSettings;
  }, [windowSettings]);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    if (!resetArmed) {
      return;
    }
    const timeout = window.setTimeout(() => setResetArmed(false), 7000);
    return () => window.clearTimeout(timeout);
  }, [resetArmed]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (screenRef.current === "settings" && event.key === "Escape" && saveAllowedRef.current) {
        event.preventDefault();
        setScreen("game");
        return;
      }

      if (screenRef.current !== "game") {
        return;
      }

      const panel = panelShortcuts[event.key];
      if (panel) {
        event.preventDefault();
        setSelectedPanel(panel);
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "p") {
        event.preventDefault();
        setState((current) => setBattlePlan(current, "push"));
        return;
      }

      if (key === "f") {
        event.preventDefault();
        setState((current) => setBattlePlan(current, "farm"));
        return;
      }

      if (key === "h") {
        event.preventDefault();
        setState((current) => setBattlePlan(current, "hold"));
        return;
      }

      if (key === "r") {
        event.preventDefault();
        setState((current) => retryCurrentStage(current));
        return;
      }

      if (key === "s") {
        event.preventDefault();
        setScreen("settings");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    return window.afkHeroMenu?.onCommand((command) => {
      if (command === "open-settings") {
        setScreen("settings");
        return;
      }
      if (command === "save-now") {
        flushSave("Saving now");
        return;
      }
      if (command === "display-windowed") {
        setWindowMode("windowed");
        setScreen("settings");
        return;
      }
      if (command === "display-borderless") {
        setWindowMode("borderless");
        setScreen("settings");
        return;
      }
      if (command === "display-fullscreen") {
        setWindowMode("fullscreen");
        setScreen("settings");
      }
    });
  }, [flushSave]);

  useEffect(() => {
    const syncRuntime = () => {
      runtimeRef.current = {
        hidden: document.visibilityState === "hidden",
        focused: document.hasFocus()
      };
      if (runtimeRef.current.hidden) {
        flushSave("Saving progress");
      }
    };

    const flushBeforeExit = () => flushSave("Saving progress");

    document.addEventListener("visibilitychange", syncRuntime);
    window.addEventListener("focus", syncRuntime);
    window.addEventListener("blur", syncRuntime);
    window.addEventListener("pagehide", flushBeforeExit);
    window.addEventListener("beforeunload", flushBeforeExit);
    syncRuntime();
    return () => {
      document.removeEventListener("visibilitychange", syncRuntime);
      window.removeEventListener("focus", syncRuntime);
      window.removeEventListener("blur", syncRuntime);
      window.removeEventListener("pagehide", flushBeforeExit);
      window.removeEventListener("beforeunload", flushBeforeExit);
    };
  }, [flushSave]);

  useEffect(() => {
    let mounted = true;
    const generation = loadGenerationRef.current;
    loadGameState()
      .then((loadedState) => {
        if (mounted && generation === loadGenerationRef.current) {
          stateRef.current = loadedState;
          saveAllowedRef.current = true;
          setState(loadedState);
          setScreen(loadedState.introSeen ? "game" : "title");
          setSaveStatus({ state: "saved", message: "Save ready" });
        }
      })
      .catch(() => {
        if (mounted && generation === loadGenerationRef.current) {
          saveAllowedRef.current = false;
          setScreen("settings");
          setSaveStatus({ state: "error", message: "Save blocked: original preserved" });
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (displayMode !== "windowed") {
      void window.afkHeroWindow?.setDisplayMode(displayMode);
    }
  }, []);

  useEffect(() => {
    if (windowSettings.alwaysOnTop) {
      void window.afkHeroWindow?.setAlwaysOnTop(true);
    }
    if (windowSettings.compactMode) {
      void window.afkHeroWindow?.setCompactMode(true);
    }
  }, []);

  useEffect(() => {
    let timeout = 0;
    let cancelled = false;

    const runTick = () => {
      const runtime = runtimeRef.current;
      const cadence = getRuntimeCadence(
        screenRef.current,
        runtime.hidden,
        runtime.focused,
        runtimeSettingsRef.current.lowPower
      );
      if (screenRef.current !== "game") {
        lastTickRef.current = performance.now();
        if (!cancelled) {
          timeout = window.setTimeout(runTick, cadence.tickMs);
        }
        return;
      }
      const now = performance.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;
      setState((current) => tick(current, elapsed * runtimeSettingsRef.current.battleSpeed));
      if (!cancelled) {
        timeout = window.setTimeout(runTick, cadence.tickMs);
      }
    };

    timeout = window.setTimeout(runTick, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (state.pendingBossStory && !state.seenBossStories.includes(state.pendingBossStory.id)) {
      setScreen("bossStory");
    }
  }, [state.pendingBossStory, state.seenBossStories]);

  useEffect(() => {
    const previous = previousAudioStateRef.current;
    if (state.claimedContracts.length > previous.claimedContracts) {
      audioRef.current?.play("claim");
    } else if (state.bossesDefeated > previous.bossesDefeated) {
      audioRef.current?.play("boss");
    } else if (state.overdrive < previous.overdrive && previous.overdrive >= 96) {
      audioRef.current?.play("overdrive");
    } else if (state.kills > previous.kills) {
      audioRef.current?.play("attack");
    }

    previousAudioStateRef.current = {
      kills: state.kills,
      bossesDefeated: state.bossesDefeated,
      overdrive: state.overdrive,
      claimedContracts: state.claimedContracts.length
    };
  }, [state.kills, state.bossesDefeated, state.overdrive, state.claimedContracts.length]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      flushSave();
    }, 1500);

    return () => window.clearInterval(interval);
  }, [flushSave]);

  useEffect(() => {
    const background = new Image();
    const hero = new Image();
    const enemies = enemySpriteSources.map(() => new Image());
    const bosses = bossSpriteSources.map(() => new Image());
    const attack = new Image();
    let loaded = 0;
    const totalImages = 3 + enemies.length + bosses.length;
    const markLoaded = () => {
      loaded += 1;
      if (loaded === totalImages) {
        setSprites({ background, hero, enemies, bosses, attack });
      }
    };

    background.onload = markLoaded;
    hero.onload = markLoaded;
    enemies.forEach((enemy) => {
      enemy.onload = markLoaded;
    });
    bosses.forEach((boss) => {
      boss.onload = markLoaded;
    });
    attack.onload = markLoaded;
    background.src = steamworksForgeSrc;
    hero.src = heroSpriteSrc;
    enemies.forEach((enemy, index) => {
      enemy.src = enemySpriteSources[index];
    });
    bosses.forEach((boss, index) => {
      boss.src = bossSpriteSources[index];
    });
    attack.src = attackFxSpriteSrc;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (screen !== "game" || !canvas || !context) {
      return;
    }

    let frame = 0;
    let animation = 0;
    let timeout = 0;
    let cancelled = false;
    const render = () => {
      const runtime = runtimeRef.current;
      const cadence = getRuntimeCadence(
        screenRef.current,
        runtime.hidden,
        runtime.focused,
        runtimeSettingsRef.current.lowPower
      );
      if (!cadence.renderEnabled) {
        if (!cancelled) {
          timeout = window.setTimeout(render, cadence.renderMs);
        }
        return;
      }
      frame += 1;
      drawBattleScene(context, canvas, stateRef.current, statsRef.current, frame, sprites);
      if (cancelled) {
        return;
      }
      if (cadence.renderMs > 0) {
        timeout = window.setTimeout(render, cadence.renderMs);
      } else {
        animation = window.requestAnimationFrame(render);
      }
    };
    render();
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animation);
      window.clearTimeout(timeout);
    };
  }, [sprites, screen]);

  const offlineReward = state.lastOfflineReward;
  const storyCue = state.pendingBossStory;

  const setWindowMode = (mode: DisplayMode) => {
    setDisplayMode(mode);
    saveDisplayMode(mode);
    void window.afkHeroWindow?.setDisplayMode(mode);
  };

  const updateAudioSettings = (settings: AudioSettings) => {
    const normalized = {
      enabled: settings.enabled,
      volume: Math.max(0, Math.min(1, settings.volume))
    };
    setAudioSettings(normalized);
    audioSettingsRef.current = normalized;
    saveAudioSettings(normalized);
    if (normalized.enabled) {
      audioRef.current?.unlock();
    }
  };

  const updateRuntimeSettings = (settings: RuntimeSettings) => {
    const normalized: RuntimeSettings = {
      lowPower: Boolean(settings.lowPower),
      battleSpeed: settings.battleSpeed === 2 ? 2 : 1
    };
    setRuntimeSettings(normalized);
    runtimeSettingsRef.current = normalized;
    saveRuntimeSettings(normalized);
  };

  const updateWindowSettings = (settings: WindowSettings) => {
    const normalized: WindowSettings = {
      alwaysOnTop: Boolean(settings.alwaysOnTop),
      compactMode: Boolean(settings.compactMode)
    };
    const compactModeChanged = windowSettingsRef.current.compactMode !== normalized.compactMode;
    setWindowSettings(normalized);
    windowSettingsRef.current = normalized;
    saveWindowSettings(normalized);
    void window.afkHeroWindow?.setAlwaysOnTop(normalized.alwaysOnTop);
    if (compactModeChanged) {
      void window.afkHeroWindow?.setCompactMode(normalized.compactMode);
    }
  };

  const unlockAudio = () => {
    audioRef.current?.unlock();
  };

  const startOpening = () => {
    unlockAudio();
    setOpeningIndex(0);
    setScreen("opening");
  };

  const finishOpening = () => {
    unlockAudio();
    setState((current) => markIntroSeen(current));
    setScreen("game");
  };

  const replaceSavedProgress = async (operation: () => Promise<GameState>) => {
    if (replacementInFlightRef.current) throw new Error("Save replacement already running");
    replacementInFlightRef.current = true;
    const wasAllowed = saveAllowedRef.current;
    saveAllowedRef.current = false;
    savePendingRef.current = false;
    loadGenerationRef.current += 1;
    try {
      await savePromiseRef.current;
      setNativeSavePending(true);
      const next = await operation();
      stateRef.current = next;
      saveAllowedRef.current = true;
      return next;
    } catch (error) {
      saveAllowedRef.current = wasAllowed;
      throw error;
    } finally {
      replacementInFlightRef.current = false;
      setNativeSavePending(false);
    }
  };

  const resetRun = () => {
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    setResetArmed(false);
    setSaveStatus({ state: "saving", message: "Resetting" });
    void replaceSavedProgress(() => resetGameState())
      .then((nextState) => {
        stateRef.current = nextState;
        saveAllowedRef.current = true;
        setState(nextState);
        setOpeningIndex(0);
        setScreen("title");
        setSaveStatus({ state: "saved", message: "New save ready" });
      })
      .catch(() => {
        setSaveStatus({ state: "error", message: "Reset failed" });
      });
  };

  const restoreBackup = () => {
    setSaveStatus({ state: "saving", message: "Restoring backup" });
    void replaceSavedProgress(() => restoreBackupGameState())
      .then((restored) => {
        stateRef.current = restored;
        saveAllowedRef.current = true;
        setState(restored);
        setScreen(restored.introSeen ? "game" : "title");
        setSaveStatus({ state: "saved", message: "Backup restored" });
      })
      .catch(() => {
        setSaveStatus({ state: "error", message: "Restore failed" });
      });
  };

  const exportSave = () => {
    if (!saveAllowedRef.current) return;
    const blob = new Blob([serializeGameStateForExport(stateRef.current)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `afk-hero-save-stage-${stateRef.current.highestStage}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setSaveStatus({ state: "saved", message: "Save exported" });
  };

  const exportDiagnostics = () => {
    const report = serializeDiagnosticsReport(
      stateRef.current,
      {
        displayMode,
        audioSettings: audioSettingsRef.current,
        runtimeSettings: runtimeSettingsRef.current,
        windowSettings: windowSettingsRef.current
      },
      Date.now(),
      {
        userAgent: navigator.userAgent,
        platform: navigator.platform
      }
    );
    const blob = new Blob([report], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `afk-hero-diagnostics-stage-${stateRef.current.highestStage}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setSaveStatus((current) => saveAllowedRef.current ? { state: "saved", message: "Diagnostics exported" } : current);
  };

  const importSave = async (file: File | null) => {
    if (!file) {
      return;
    }
    setSaveStatus({ state: "saving", message: "Importing save" });
    try {
      const imported = parseImportedGameState(await file.text());
      await replaceSavedProgress(async () => {
        await saveGameState(imported, { recover: true });
        return imported;
      });
      stateRef.current = imported;
      saveAllowedRef.current = true;
      setState(imported);
      setScreen(imported.introSeen ? "game" : "title");
      setSaveStatus({ state: "saved", message: "Save imported" });
    } catch {
      setSaveStatus({ state: "error", message: "Import failed" });
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  };

  return (
    <main className={windowSettings.compactMode ? "aspect-shell compact-mode" : "aspect-shell"}>
      <section className="app-shell">
        {screen === "title" ? (
          <TitleScreen
            state={state}
            onContinue={() => {
              unlockAudio();
              setScreen(state.introSeen ? "game" : "opening");
            }}
            onNew={startOpening}
          />
        ) : null}
        {screen === "opening" ? (
          <StoryScreen
            eyebrow="Opening"
            title={openingStory[openingIndex].title}
            body={openingStory[openingIndex].body}
            actionLabel={openingIndex === openingStory.length - 1 ? "Begin Expedition" : "Next Memory"}
            onAction={() => {
              unlockAudio();
              if (openingIndex === openingStory.length - 1) {
                finishOpening();
                return;
              }
              setOpeningIndex((current) => current + 1);
            }}
          />
        ) : null}
        {screen === "bossStory" && storyCue ? (
          <StoryScreen
            eyebrow={`${storyCue.regionName} Secured`}
            title={storyCue.title}
            body={storyCue.body}
            artSrc={getStoryArtSource(storyCue.regionName)}
            artKind="boss"
            actionLabel="Return to the Forge"
            onAction={() => {
              unlockAudio();
              setState((current) => acknowledgeBossStory(current, storyCue.id));
              setScreen("game");
            }}
          />
        ) : null}
        {screen === "storyReplay" && replayStory ? (
          <StoryScreen
            eyebrow={`${replayStory.regionName} Chronicle`}
            title={replayStory.title}
            body={replayStory.body}
            artSrc={getStoryArtSource(replayStory.regionName)}
            artKind={replayStory.regionName === "Opening" ? "hero" : "boss"}
            actionLabel="Return to Map"
            progressLabel={`${deriveStoryArchive(state).filter((entry) => entry.unlocked).length}/${deriveStoryArchive(state).length} records unlocked`}
            onAction={() => {
              unlockAudio();
              setReplayStory(null);
              setSelectedPanel("map");
              setScreen("game");
            }}
          />
        ) : null}
        {screen === "settings" ? (
          <SettingsScreen
            displayMode={displayMode}
            audioSettings={audioSettings}
            runtimeSettings={runtimeSettings}
            windowSettings={windowSettings}
            onMode={setWindowMode}
            onAudio={updateAudioSettings}
            onRuntime={updateRuntimeSettings}
            onWindowSettings={updateWindowSettings}
            onSaveNow={() => flushSave("Saving now")}
            onRestoreBackup={restoreBackup}
            onExport={exportSave}
            onDiagnostics={exportDiagnostics}
            onImportClick={() => importInputRef.current?.click()}
            onImportFile={importSave}
            importInputRef={importInputRef}
            saveStatus={saveStatus}
            saveBlocked={!saveAllowedRef.current}
            onClose={() => setScreen("game")}
          />
        ) : null}
        {screen === "game" ? (
          <GameScreen
            state={state}
            stats={stats}
            forecast={forecast}
            combatFeedback={combatFeedback}
            rewardPreview={rewardPreview}
            latestDrop={latestDrop}
            selectedPanel={selectedPanel}
            setSelectedPanel={setSelectedPanel}
            setState={setState}
            canvasRef={canvasRef}
            offlineReward={offlineReward}
            saveStatus={saveStatus}
            onSettings={() => setScreen("settings")}
            onReplayStory={(entry) => {
              setReplayStory(entry);
              setScreen("storyReplay");
            }}
            resetArmed={resetArmed}
            onReset={resetRun}
          />
        ) : null}
      </section>
    </main>
  );
}

function GameScreen({
  state,
  stats,
  forecast,
  combatFeedback,
  rewardPreview,
  latestDrop,
  selectedPanel,
  setSelectedPanel,
  setState,
  canvasRef,
  offlineReward,
  saveStatus,
  onSettings,
  onReplayStory,
  resetArmed,
  onReset
}: {
  state: GameState;
  stats: ReturnType<typeof deriveStats>;
  forecast: ReturnType<typeof deriveBattleForecast>;
  combatFeedback: ReturnType<typeof deriveCombatFeedback>;
  rewardPreview: ReturnType<typeof deriveRewardPreview>;
  latestDrop?: EquipmentItem;
  selectedPanel: PanelKey;
  setSelectedPanel: (panel: PanelKey) => void;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  offlineReward?: GameState["lastOfflineReward"];
  saveStatus: SaveStatus;
  onSettings: () => void;
  onReplayStory: (entry: StoryArchiveEntry) => void;
  resetArmed: boolean;
  onReset: () => void;
}) {
  const xpPercent = Math.min(100, (state.xp / stats.xpToNext) * 100);
  const heroHpPercent = Math.max(0, Math.min(100, (state.heroHp / stats.maxHp) * 100));
  const enemyHpPercent = Math.max(0, Math.min(100, (state.enemyHp / stats.enemyMaxHp) * 100));
  const overdrivePercent = Math.max(0, Math.min(100, state.overdrive));
  const reforgePreview = deriveReforgePreview(state);

  return (
    <>
      <section className="topbar">
        <div className="brand-block">
          <div className="brand-mark">AH</div>
          <div>
            <h1>AFK HERO</h1>
            <p>Retro steamworks idle RPG</p>
          </div>
        </div>
        <div className="resource-strip" aria-label="Resources">
          <Resource icon={<Coins size={18} />} label="Gold" value={formatNumber(state.gold)} />
          <Resource icon={<Gem size={18} />} label="Relics" value={formatNumber(state.relics)} />
          <Resource icon={<Sparkles size={18} />} label="Parts" value={formatNumber(state.parts)} />
          <Resource icon={<Flame size={18} />} label="Essence" value={formatNumber(state.essence)} />
          <Resource icon={<Trophy size={18} />} label="Stage" value={`${state.stage}/${stats.stageCap}`} />
          <Resource icon={<Map size={18} />} label="Best" value={`${state.highestStage}`} />
          <Resource icon={<Activity size={18} />} label="Power" value={formatNumber(stats.powerScore)} />
          <SaveStatusBadge status={saveStatus} />
          <button className="icon-button" onClick={onSettings} title="Settings">
            <Settings size={19} />
          </button>
        </div>
      </section>

      <section className="game-layout">
        <aside className="hero-panel">
          <div className="portrait">
            <div className="portrait-halo" />
            <img className="portrait-sprite" src={heroSpriteSrc} alt="" />
          </div>
          <div className="hero-title">
            <span>Lv. {state.level}</span>
            <strong>{state.heroName}</strong>
          </div>
          <div className="level-chip">
            <Sparkles size={15} />
            Talent points {state.levelPoints}
          </div>
          <Bar label="HP" value={`${Math.round(state.heroHp)} / ${stats.maxHp}`} percent={heroHpPercent} tone="green" />
          <Bar label="XP" value={`${state.xp} / ${stats.xpToNext}`} percent={xpPercent} tone="blue" />
          <Bar
            label="Overdrive"
            value={`${Math.round(state.overdrive)} / 100`}
            percent={overdrivePercent}
            tone="amber"
          />
          <div className="stat-grid">
            <Stat icon={<Swords size={18} />} label="Damage" value={formatNumber(stats.damage)} />
            <Stat icon={<Shield size={18} />} label="Defense" value={formatNumber(stats.defense)} />
            <Stat icon={<Zap size={18} />} label="Crit" value={`${Math.round(stats.critChance * 100)}%`} />
            <Stat icon={<Flame size={18} />} label="Burst" value={formatNumber(stats.overdriveDamage)} />
          </div>
          <button
            className="ascend-button"
            disabled={!reforgePreview.available}
            onClick={() => setState((current) => ascend(current))}
            title="Reset run for permanent relic power"
          >
            <Sparkles size={18} />
            Reforge +{formatNumber(reforgePreview.earnedRelics)}
          </button>
          <div className={reforgePreview.available ? "reforge-preview ready" : "reforge-preview"} aria-label="Reforge preview">
            <span>{reforgePreview.available ? "Ready" : "Stage 30 required"}</span>
            <strong>{formatNumber(reforgePreview.nextRelicDamageBonusPercent)}% relic power after reforge</strong>
            <small>
              Keeps {formatNumber(reforgePreview.retainedSkillRanks)} skill ranks ·{" "}
              {formatNumber(reforgePreview.retainedEquipment)} gear drops · {formatNumber(reforgePreview.retainedParts)} parts
            </small>
          </div>
        </aside>

        <section className="battle-panel">
          <div className="battle-header">
            <div>
              <span>
                Zone {state.zone} · {stats.regionName}
              </span>
              <h2>{stats.enemyName}</h2>
            </div>
            <div className="battle-chips">
              <div className="boss-chip">
                <Gauge size={15} />
                {state.campaignCleared ? "Route Complete" : `Boss ${stats.nextBossStage}`}
              </div>
              <div className="boss-chip" title={stats.enemyTraitDetail}>
                <Activity size={15} />
                {stats.enemyTraitLabel}
              </div>
              <div className={stats.stageBoss ? "boss-chip active" : "boss-chip"}>{stats.stageBoss ? "Boss" : "Wave"}</div>
            </div>
          </div>
          <canvas ref={canvasRef} width="760" height="420" aria-label="AFK HERO battle scene" />
          <Bar
            label="Enemy"
            value={`${Math.max(0, Math.round(state.enemyHp))} / ${stats.enemyMaxHp}`}
            percent={enemyHpPercent}
            tone="red"
          />
          <CombatFeedbackPanel feedback={combatFeedback} />
          <RewardPreviewPanel reward={rewardPreview} />
          {latestDrop ? <LatestDropBanner item={latestDrop} /> : null}
          <BattlePlanControl
            battlePlan={state.battlePlan}
            stageBoss={stats.stageBoss}
            onChange={(battlePlan) => setState((current) => setBattlePlan(current, battlePlan))}
            onRetry={() => setState((current) => retryCurrentStage(current))}
          />
          <BattleForecastPanel forecast={forecast} />
          {offlineReward && offlineReward.seconds > 0 ? (
            <div className="offline-reward">
              <Sparkles size={18} />
              Offline reward: {offlineReward.capped ? "Offline cap reached · " : ""}
              {formatDuration(offlineReward.seconds)} · {formatNumber(offlineReward.gold)} gold ·{" "}
              {formatNumber(offlineReward.xp)} XP · {formatNumber(offlineReward.parts)} parts ·{" "}
              {formatNumber(offlineReward.essence)} essence · +{offlineReward.stages} stages
            </div>
          ) : null}
        </section>

        <aside className="upgrade-panel">
          <div className="tabs" role="tablist" aria-label="Upgrade panels">
            <button
              className={selectedPanel === "gear" ? "active" : ""}
              role="tab"
              aria-selected={selectedPanel === "gear"}
              onClick={() => setSelectedPanel("gear")}
            >
              Forge
            </button>
            <button
              className={selectedPanel === "skills" ? "active" : ""}
              role="tab"
              aria-selected={selectedPanel === "skills"}
              onClick={() => setSelectedPanel("skills")}
            >
              Skills
            </button>
            <button
              className={selectedPanel === "contracts" ? "active" : ""}
              role="tab"
              aria-selected={selectedPanel === "contracts"}
              onClick={() => setSelectedPanel("contracts")}
            >
              Goals
            </button>
            <button
              className={selectedPanel === "map" ? "active" : ""}
              role="tab"
              aria-selected={selectedPanel === "map"}
              onClick={() => setSelectedPanel("map")}
            >
              Map
            </button>
            <button
              className={selectedPanel === "loot" ? "active" : ""}
              role="tab"
              aria-selected={selectedPanel === "loot"}
              onClick={() => setSelectedPanel("loot")}
            >
              Loot
            </button>
            <button
              className={selectedPanel === "report" ? "active" : ""}
              role="tab"
              aria-selected={selectedPanel === "report"}
              onClick={() => setSelectedPanel("report")}
            >
              Report
            </button>
          </div>

          <PanelContent selectedPanel={selectedPanel} state={state} setState={setState} onReplayStory={onReplayStory} />

          <button
            className={resetArmed ? "reset-button armed" : "reset-button"}
            onClick={onReset}
            title="Reset local save"
          >
            <RotateCcw size={17} />
            {resetArmed ? "Confirm New Run" : "New Run"}
          </button>
        </aside>
      </section>
    </>
  );
}

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  const icon = status.state === "error" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />;
  return (
    <div className={`save-status ${status.state}`} role="status" aria-label={`Save status: ${status.message}`}>
      {icon}
      <span>{status.message}</span>
    </div>
  );
}

function CombatFeedbackPanel({ feedback }: { feedback: ReturnType<typeof deriveCombatFeedback> }) {
  return (
    <div className="combat-feedback" aria-label="Combat feedback">
      <FeedbackMetric label="Hit" value={formatNumber(feedback.hitDamage)} />
      <FeedbackMetric label="Crit" value={formatNumber(feedback.critDamage)} />
      <FeedbackMetric label="Burst" value={formatNumber(feedback.burstDamage)} />
      <FeedbackMetric label="Threat" value={`${feedback.threatLabel} · ${formatNumber(feedback.incomingDamage)}`} />
    </div>
  );
}

function RewardPreviewPanel({ reward }: { reward: ReturnType<typeof deriveRewardPreview> }) {
  const currencyText =
    reward.essence > 0 || reward.relics > 0
      ? `${formatNumber(reward.parts)} / ${formatNumber(reward.essence)} / ${formatNumber(reward.relics)}`
      : formatNumber(reward.parts);
  return (
    <div className="reward-preview" aria-label="Reward preview">
      <FeedbackMetric label="Gold" value={formatNumber(reward.gold)} />
      <FeedbackMetric label="XP" value={formatNumber(reward.xp)} />
      <FeedbackMetric label={reward.essence > 0 || reward.relics > 0 ? "Parts/Ess/Relic" : "Parts"} value={currencyText} />
      <FeedbackMetric label="Drop" value={reward.dropLabel} />
    </div>
  );
}

function LatestDropBanner({ item }: { item: EquipmentItem }) {
  return (
    <div className={`latest-drop ${item.rarity}`} aria-label="Latest drop">
      <Package size={18} />
      <div>
        <span>
          Latest Drop · {rarityLabels[item.rarity]} · Stage {item.droppedAtStage}
        </span>
        <strong>
          {item.name} · Power {formatNumber(item.power)}
        </strong>
      </div>
    </div>
  );
}

function FeedbackMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function BattlePlanControl({
  battlePlan,
  stageBoss,
  onChange,
  onRetry
}: {
  battlePlan: BattlePlan;
  stageBoss: boolean;
  onChange: (battlePlan: BattlePlan) => void;
  onRetry: () => void;
}) {
  return (
    <div className="battle-plan" aria-label="Battle plan">
      <span>Battle Plan</span>
      <div>
        <button
          type="button"
          className={battlePlan === "push" ? "active" : ""}
          aria-pressed={battlePlan === "push"}
          title="Push battle plan"
          onClick={() => onChange("push")}
        >
          <Gauge size={16} />
          Push
        </button>
        <button
          type="button"
          className={battlePlan === "farm" ? "active" : ""}
          aria-pressed={battlePlan === "farm"}
          title="Farm battle plan"
          onClick={() => onChange("farm")}
        >
          <Coins size={16} />
          Farm
        </button>
        <button
          type="button"
          className={battlePlan === "hold" ? "active" : ""}
          aria-pressed={battlePlan === "hold"}
          title="Hold battle plan"
          onClick={() => onChange("hold")}
        >
          <Shield size={16} />
          Hold
        </button>
        <button type="button" onClick={onRetry} title="Restart the current wave or boss with full HP">
          <RotateCcw size={16} />
          {stageBoss ? "Retry Boss" : "Retry Stage"}
        </button>
      </div>
    </div>
  );
}

function BattleForecastPanel({ forecast }: { forecast: ReturnType<typeof deriveBattleForecast> }) {
  return (
    <div className="battle-forecast" aria-label="Battle forecast">
      <ForecastMetric label="Clear ETA" value={formatDuration(Math.round(forecast.clearSeconds))} />
      <ForecastMetric label="Gold/min" value={formatNumber(forecast.goldPerMinute)} />
      <ForecastMetric label="XP/min" value={formatNumber(forecast.xpPerMinute)} />
      <ForecastMetric label="Offline cap" value={`${forecast.offlineCapHours}h`} />
    </div>
  );
}

function ForecastMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function PanelContent({
  selectedPanel,
  state,
  setState,
  onReplayStory
}: {
  selectedPanel: PanelKey;
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  onReplayStory: (entry: StoryArchiveEntry) => void;
}) {
  if (selectedPanel === "map") {
    return <StageMapPanel state={state} setState={setState} onReplayStory={onReplayStory} />;
  }

  if (selectedPanel === "loot") {
    return <LootPanel state={state} setState={setState} />;
  }

  if (selectedPanel === "contracts") {
    return <ContractsPanel state={state} setState={setState} />;
  }

  if (selectedPanel === "report") {
    return <RunReportPanel state={state} setState={setState} />;
  }

  if (selectedPanel === "skills") {
    return <SkillsPanel state={state} setState={setState} />;
  }

  const forgePreview = deriveForgeAllPreview(state);
  const craftingPreview = deriveCraftingPreview(state);
  return (
    <>
      <div className="gear-toolbar" aria-label="Gear forge actions">
        <div>
          <strong>Workshop Queue</strong>
          <span>
            {forgePreview.available
              ? `${forgePreview.totalUpgrades} upgrades · ${formatCost(forgePreview.goldCost, "gold", forgePreview.partsCost, "parts")}`
              : forgePreview.nextUpgradeLabel}
            {" · "}
            Craft {craftingPreview.itemName} for {formatCost(craftingPreview.partsCost, "parts", craftingPreview.essenceCost, "essence")}
          </span>
        </div>
        <div className="gear-actions">
          <button
            type="button"
            disabled={!craftingPreview.available}
            onClick={() => setState((current) => craftEquipmentItem(current))}
          >
            <Package size={16} />
            Craft Gear
          </button>
          <button
            type="button"
            disabled={!forgePreview.available}
            onClick={() => setState((current) => forgeAffordableGear(current))}
          >
            <Sparkles size={16} />
            Forge All
          </button>
        </div>
      </div>
      <div className="upgrade-list">
        {gearKeys.map((key) => (
          <UpgradeRow
            key={key}
            title={gearLabels[key]}
            level={state.gear[key]}
            detail={gearDetail(key)}
            preview={deriveUpgradePreview(state, "gear", key)}
            cost={formatCost(getGearCost(state, key), "gold", getGearPartCost(state, key), "parts")}
            disabled={state.gold < getGearCost(state, key) || state.parts < getGearPartCost(state, key)}
            onBuy={() => setState((current) => buyGear(current, key))}
          />
        ))}
      </div>
    </>
  );
}

function SkillsPanel({
  state,
  setState
}: {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
}) {
  const refund = deriveSkillRefund(state);
  return (
    <>
      <div className="skill-toolbar" aria-label="Skill respec actions">
        <div>
          <strong>Build Direction</strong>
          <span>
            Refund {formatNumber(refund.relics)} relics · {formatNumber(refund.essence)} essence ·{" "}
            {formatNumber(refund.levelPoints)} talent
          </span>
        </div>
        <button type="button" disabled={refund.levelPoints === 0} onClick={() => setState((current) => respecSkills(current))}>
          <RotateCcw size={16} />
          Respec Skills
        </button>
      </div>
      <div className="upgrade-list">
        {skillKeys.map((key) => {
          const capped = state.skills[key] >= maxSkillRank;
          return (
            <UpgradeRow
              key={key}
              title={skillLabels[key]}
              level={state.skills[key]}
              detail={skillDetail(key)}
              preview={deriveUpgradePreview(state, "skill", key)}
              cost={capped ? "Max" : formatCost(getSkillCost(state, key), "relics", getSkillEssenceCost(state, key), "essence", 1, "talent")}
              disabled={
                capped ||
                state.relics < getSkillCost(state, key) ||
                state.essence < getSkillEssenceCost(state, key) ||
                state.levelPoints < 1
              }
              onBuy={() => setState((current) => buySkill(current, key))}
            />
          );
        })}
      </div>
    </>
  );
}

function RunReportPanel({
  state,
  setState
}: {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
}) {
  const report = deriveRunReport(state);
  const achievements = deriveAchievements(state);
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlocked).length;
  const milestonePercent = Math.max(0, Math.min(100, (report.nextMilestoneProgress / report.nextMilestoneTarget) * 100));
  return (
    <div className="report-panel" aria-label="Run Report">
      <div className="report-hero">
        <span>Run Report</span>
        <strong>{report.pressureRank}</strong>
        <p>
          Stage {state.highestStage}/{maxStage} · {report.routeProgressPercent}% route charted
        </p>
      </div>
      <div className="report-grid">
        <ReportMetric label="Boss Seals" value={`${report.bossesCleared}/${report.bossesTotal}`} />
        <ReportMetric label="Claimable Goals" value={`${report.readyContracts}`} />
        <ReportMetric label="Loadout" value={`${report.equippedSlots}/5`} />
        <ReportMetric label="Gear Power" value={formatNumber(report.equipmentPower)} />
      </div>
      <div className="report-card achievement-card" aria-label="Achievement badges">
        <div className="contract-title">
          <strong>Achievement Badges</strong>
          <span>
            {unlockedAchievements} / {achievements.length}
          </span>
        </div>
        <div className="achievement-grid">
          {achievements.map((achievement) => (
            <article className={achievement.unlocked ? "achievement-badge unlocked" : "achievement-badge"} key={achievement.id}>
              <Trophy size={15} />
              <div>
                <strong>{achievement.title}</strong>
                <span>
                  {achievement.unlocked ? "Unlocked" : `${achievement.progress}/${achievement.target}`} · {achievement.detail}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="report-card">
        <div className="contract-title">
          <strong>Route Progress</strong>
          <span>{report.routeProgressPercent}%</span>
        </div>
        <div className="bar-track amber">
          <div style={{ width: `${report.routeProgressPercent}%` }} />
        </div>
      </div>
      <div className="report-card">
        <div className="contract-title">
          <strong>{report.nextMilestoneLabel}</strong>
          <span>
            {report.nextMilestoneProgress} / {report.nextMilestoneTarget}
          </span>
        </div>
        <div className="bar-track blue">
          <div style={{ width: `${milestonePercent}%` }} />
        </div>
      </div>
      <div className={report.nextActionReady ? "report-card ready" : "report-card"}>
        <div className="contract-title">
          <strong>Next Action</strong>
          <span>{report.nextActionReady ? "Ready" : "Planning"}</span>
        </div>
        <p>
          {report.nextActionLabel} · {report.nextActionDetail}
        </p>
        <button type="button" className="report-action-button" disabled={!report.nextActionReady} onClick={() => setState((current) => applyRecommendedRunAction(current))}>
          Run Action
        </button>
      </div>
      <div className="report-card">
        <div className="contract-title">
          <strong>Contract Ledger</strong>
          <span>
            {report.claimedContracts} / {report.contractTotal}
          </span>
        </div>
        <p>
          {formatNumber(state.totalGold)} lifetime gold · {formatNumber(state.kills)} machines cleared
        </p>
      </div>
      <div className="report-card activity-log" aria-label="Recent Activity">
        <div className="contract-title">
          <strong>Recent Activity</strong>
          <span>{state.runLog.length}/12</span>
        </div>
        {state.runLog.length > 0 ? (
          <div className="activity-list">
            {state.runLog.slice(0, 5).map((entry) => (
              <article className={`activity-entry ${entry.kind}`} key={entry.id}>
                <span>{formatActivityTime(entry.at)}</span>
                <div>
                  <strong>{entry.title}</strong>
                  <p>
                    Stage {entry.stage} · {entry.detail}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p>No route events recorded.</p>
        )}
      </div>
    </div>
  );
}

function formatActivityTime(value: number) {
  if (!Number.isFinite(value)) {
    return "--:--";
  }
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="report-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StageMapPanel({
  state,
  setState,
  onReplayStory
}: {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  onReplayStory: (entry: StoryArchiveEntry) => void;
}) {
  const clearedBosses = Math.floor(state.highestStage / bossInterval);
  const storyArchive = deriveStoryArchive(state);
  const bestiary = deriveBestiary(state);
  const challengeTrials = deriveChallengeTrials(state);
  return (
    <>
      <div className="map-list">
        {regionNames.map((regionName, index) => {
          const start = index * 20 + 1;
          const end = Math.min(maxStage, start + 19);
          const unlocked = state.highestStage >= start;
          const regionBossStart = index * 2 + 1;
          const regionBossesCleared = Math.max(0, Math.min(2, clearedBosses - regionBossStart + 1));
          return (
            <article className={unlocked ? "map-row unlocked" : "map-row"} key={regionName}>
              <div>
                <span>
                  Stage {start}-{end}
                </span>
                <strong>{regionName}</strong>
              </div>
              <div className="seal-track" aria-label={`${regionName} boss seals`}>
                <i className={regionBossesCleared >= 1 ? "cleared" : ""} />
                <i className={regionBossesCleared >= 2 ? "cleared" : ""} />
              </div>
              <button
                type="button"
                className="travel-button"
                disabled={!unlocked || state.stage === start}
                title={unlocked ? `Travel to ${regionName}` : "Region locked"}
                onClick={() => setState((current) => travelToStage(current, start))}
              >
                <Map size={15} />
                {state.stage === start ? "Current" : "Travel"}
              </button>
            </article>
          );
        })}
      </div>
      <div className="bestiary-panel" aria-label="Bestiary">
        <div className="chronicle-title">
          <Swords size={17} />
          <strong>Bestiary</strong>
          <span>
            {bestiary.filter((entry) => entry.unlocked).length}/{bestiary.length}
          </span>
        </div>
        <div className="bestiary-list">
          {bestiary.map((entry) => (
            <article className={entry.unlocked ? "bestiary-row unlocked" : "bestiary-row"} key={entry.regionName}>
              <div>
                <span>{entry.regionName}</span>
                <strong>{entry.unlocked ? entry.bossName : "Sealed Machines"}</strong>
              </div>
              <p>
                {entry.unlocked
                  ? `${entry.enemyTraits.join(" / ")} · ${entry.bossMechanic}: ${entry.bossDetail}`
                  : "Scout the district to reveal its machines."}
              </p>
              {entry.unlocked ? <small>{entry.enemyNames.join(", ")}</small> : null}
            </article>
          ))}
        </div>
      </div>
      <div className="challenge-panel" aria-label="Challenge Tower">
        <div className="chronicle-title">
          <Trophy size={17} />
          <strong>Challenge Tower</strong>
          <span>
            {challengeTrials.filter((trial) => trial.cleared).length}/{challengeTrials.length}
          </span>
        </div>
        <div className="challenge-list">
          {challengeTrials.map((trial) => {
            const powerPercent = Math.max(0, Math.min(100, (trial.currentPower / trial.requiredPower) * 100));
            return (
              <article className={trial.cleared ? "challenge-row cleared" : trial.ready ? "challenge-row ready" : "challenge-row"} key={trial.id}>
                <div className="contract-title">
                  <div>
                    <span>{trial.regionName}</span>
                    <strong>{trial.title}</strong>
                  </div>
                  <em>{trial.cleared ? "Cleared" : trial.ready ? "Ready" : `Stage ${trial.requiredStage}`}</em>
                </div>
                <p>{trial.detail}</p>
                <div className="bar-track blue" aria-label={`${trial.title} power readiness`}>
                  <div style={{ width: `${powerPercent}%` }} />
                </div>
                <small>
                  Power {formatNumber(Math.min(trial.currentPower, trial.requiredPower))}/{formatNumber(trial.requiredPower)} · {trial.rewardLabel}
                </small>
              </article>
            );
          })}
        </div>
      </div>
      <div className="chronicle-panel" aria-label="Chronicle">
        <div className="chronicle-title">
          <BookOpen size={17} />
          <strong>Chronicle</strong>
          <span>
            {storyArchive.filter((entry) => entry.unlocked).length}/{storyArchive.length}
          </span>
        </div>
        <div className="chronicle-list">
          {storyArchive.map((entry) => (
            <article className={entry.unlocked ? "chronicle-row unlocked" : "chronicle-row"} key={entry.id}>
              <div>
                <span>{entry.regionName}</span>
                <strong>{entry.unlocked ? entry.title : "Sealed Record"}</strong>
              </div>
              <p>{entry.unlocked ? entry.body : "Pressure seal intact."}</p>
              {entry.unlocked ? (
                <button type="button" onClick={() => onReplayStory(entry)}>
                  <Play size={15} />
                  Replay
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </>
  );
}

function ContractsPanel({
  state,
  setState
}: {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
}) {
  const contracts = deriveContracts(state);
  const readyCount = contracts.filter((contract) => contract.completed && !contract.claimed).length;
  return (
    <>
      <div className="contract-toolbar" aria-label="Goal claim actions">
        <span>{readyCount} ready</span>
        <button type="button" disabled={readyCount === 0} onClick={() => setState((current) => claimAllContracts(current))}>
          Claim All
        </button>
      </div>
      <div className="contract-list">
        {contracts.map((contract) => {
          const percent = Math.max(0, Math.min(100, (contract.progress / contract.target) * 100));
          return (
            <article className={contract.claimed ? "contract-row claimed" : "contract-row"} key={contract.id}>
              <div className="contract-title">
                <strong>{contract.title}</strong>
                <span>{contract.claimed ? "Claimed" : `${Math.min(contract.progress, contract.target)} / ${contract.target}`}</span>
              </div>
              <div className="bar-track amber">
                <div style={{ width: `${percent}%` }} />
              </div>
              <div className="contract-reward">
                <span>{formatReward(contract.reward)}</span>
                <button
                  disabled={!contract.completed || contract.claimed}
                  onClick={() => setState((current) => claimContract(current, contract.id))}
                >
                  {contract.claimed ? "Done" : "Claim"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

function LootPanel({
  state,
  setState
}: {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
}) {
  const unequippedCommonCount = state.inventory.filter(
    (item) => item.rarity === "common" && !item.locked && state.equipped[item.slot] !== item.id
  ).length;
  const autoSellSet = new Set(state.autoSellRarities);
  const autoSellButtons = (
    <div className="auto-sell-controls" aria-label="Auto-sell filters">
      <span>Auto-Sell</span>
      {autoSellRarityOptions.map((rarity) => (
        <button
          key={rarity}
          type="button"
          className={autoSellSet.has(rarity) ? "active" : ""}
          aria-pressed={autoSellSet.has(rarity)}
          onClick={() => setState((current) => toggleAutoSellRarity(current, rarity))}
        >
          {rarityLabels[rarity]}
        </button>
      ))}
    </div>
  );

  if (state.inventory.length === 0) {
    return (
      <>
        {autoSellButtons}
        <div className="empty-loot">
          <Package size={28} />
          <strong>No drops yet</strong>
          <span>Bosses always drop gear. Normal waves can drop gear every few clears.</span>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="loot-toolbar">
        <span>{state.inventory.length} drops stored</span>
        <div>
          <button type="button" onClick={() => setState((current) => equipBestItems(current))}>
            Equip Best
          </button>
          <button
            type="button"
            className="secondary"
            disabled={unequippedCommonCount === 0}
            onClick={() => setState((current) => sellUnequippedByRarity(current, "common"))}
          >
            Sell Common
          </button>
        </div>
      </div>
      {autoSellButtons}
      <div className="loot-list">
        {state.inventory.map((item) => (
          <LootRow
            key={item.id}
            item={item}
            equipped={state.equipped[item.slot] === item.id}
            currentPower={getCurrentSlotPower(state, item.slot)}
            onEquip={() => setState((current) => equipItem(current, item.id))}
            onSell={() => setState((current) => sellItem(current, item.id))}
            onToggleLock={() => setState((current) => toggleEquipmentLock(current, item.id))}
          />
        ))}
      </div>
    </>
  );
}

function LootRow({
  item,
  equipped,
  currentPower,
  onEquip,
  onSell,
  onToggleLock
}: {
  item: EquipmentItem;
  equipped: boolean;
  currentPower: number;
  onEquip: () => void;
  onSell: () => void;
  onToggleLock: () => void;
}) {
  const delta = item.power - currentPower;
  return (
    <article className={item.locked ? `loot-row ${item.rarity} locked` : `loot-row ${item.rarity}`}>
      <div className="loot-meta">
        <span>
          {rarityLabels[item.rarity]} · Lv. {item.level}
          {item.locked ? " · Locked" : ""}
        </span>
        <strong>{item.name}</strong>
        <p>
          {gearLabels[item.slot]} · Power {item.power} · {delta >= 0 ? "+" : ""}
          {delta}
        </p>
      </div>
      <div className="loot-actions">
        <button disabled={equipped} onClick={onEquip}>
          {equipped ? "Equipped" : "Equip"}
        </button>
        <button className={item.locked ? "active" : "secondary"} onClick={onToggleLock}>
          {item.locked ? "Unlock" : "Lock"}
        </button>
        <button className="secondary" disabled={item.locked} onClick={onSell}>
          Sell
        </button>
      </div>
    </article>
  );
}

function getCurrentSlotPower(state: GameState, slot: GearKey) {
  const itemId = state.equipped[slot];
  if (!itemId) {
    return 0;
  }
  return state.inventory.find((item) => item.id === itemId)?.power ?? 0;
}

function TitleScreen({ state, onContinue, onNew }: { state: GameState; onContinue: () => void; onNew: () => void }) {
  return (
    <section className="title-screen">
      <div className="title-hero">
        <div className="brand-mark large">AH</div>
        <h1>AFK HERO</h1>
        <p>Steam, steel, and idle expedition pressure.</p>
        <div className="title-actions">
          <button onClick={onContinue}>
            <Play size={18} />
            {state.introSeen ? "Continue" : "Start"}
          </button>
          <button className="secondary" onClick={onNew}>
            <BookOpen size={18} />
            Opening
          </button>
        </div>
      </div>
      <div className="title-status">
        <Resource icon={<Trophy size={18} />} label="Best Stage" value={`${state.highestStage}`} />
        <Resource icon={<Coins size={18} />} label="Gold" value={formatNumber(state.gold)} />
        <Resource icon={<Sparkles size={18} />} label="Parts" value={formatNumber(state.parts)} />
        <Resource icon={<Flame size={18} />} label="Essence" value={formatNumber(state.essence)} />
      </div>
    </section>
  );
}

function StoryScreen({
  eyebrow,
  title,
  body,
  actionLabel,
  progressLabel,
  artSrc = heroSpriteSrc,
  artKind = "hero",
  onAction
}: {
  eyebrow: string;
  title: string;
  body: string;
  actionLabel: string;
  progressLabel?: string;
  artSrc?: string;
  artKind?: "hero" | "boss";
  onAction: () => void;
}) {
  return (
    <section className="story-screen">
      <div className="story-art" data-story-art={artKind}>
        <img src={artSrc} alt="" />
      </div>
      <div className="story-copy">
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{body}</p>
        {progressLabel ? <small>{progressLabel}</small> : null}
        <button onClick={onAction}>
          <Play size={18} />
          {actionLabel}
        </button>
      </div>
    </section>
  );
}

function getStoryArtSource(regionName: string) {
  const regionIndex = regionNames.indexOf(regionName);
  if (regionIndex < 0) {
    return heroSpriteSrc;
  }
  return bossSpriteSources[regionIndex % bossSpriteSources.length];
}

function SettingsScreen({
  displayMode,
  audioSettings,
  runtimeSettings,
  windowSettings,
  onMode,
  onAudio,
  onRuntime,
  onWindowSettings,
  onSaveNow,
  onRestoreBackup,
  onExport,
  onDiagnostics,
  onImportClick,
  onImportFile,
  importInputRef,
  saveStatus,
  saveBlocked,
  onClose
}: {
  displayMode: DisplayMode;
  audioSettings: AudioSettings;
  runtimeSettings: RuntimeSettings;
  windowSettings: WindowSettings;
  onMode: (mode: DisplayMode) => void;
  onAudio: (settings: AudioSettings) => void;
  onRuntime: (settings: RuntimeSettings) => void;
  onWindowSettings: (settings: WindowSettings) => void;
  onSaveNow: () => void;
  onRestoreBackup: () => void;
  onExport: () => void;
  onDiagnostics: () => void;
  onImportClick: () => void;
  onImportFile: (file: File | null) => void;
  importInputRef: React.RefObject<HTMLInputElement | null>;
  saveStatus: SaveStatus;
  saveBlocked: boolean;
  onClose: () => void;
}) {
  return (
    <section className="settings-screen">
      <div className="settings-panel">
        <div className="settings-header">
          <div>
            <span>Settings</span>
            <h1>Display</h1>
          </div>
          <SaveStatusBadge status={saveStatus} />
        </div>
        {saveBlocked ? <p role="alert">Original progress is preserved. Use Restore Backup, Import Save or Reset Save to recover. Saving is blocked until recovery succeeds.</p> : null}
        <div className="mode-grid">
          <button className={displayMode === "windowed" ? "active" : ""} onClick={() => onMode("windowed")}>
            <Monitor size={20} />
            Windowed
          </button>
          <button className={displayMode === "borderless" ? "active" : ""} onClick={() => onMode("borderless")}>
            <Maximize size={20} />
            Borderless
          </button>
          <button className={displayMode === "fullscreen" ? "active" : ""} onClick={() => onMode("fullscreen")}>
            <Maximize size={20} />
            Fullscreen
          </button>
        </div>
        <div className="runtime-settings">
          <div className="audio-title">
            <strong>Desktop</strong>
            <span>
              {windowSettings.compactMode ? "Compact" : "Standard"} ·{" "}
              {windowSettings.alwaysOnTop ? "Keep On Top" : "Normal Stack"}
            </span>
          </div>
          <div className="sound-grid">
            <button
              className={!windowSettings.alwaysOnTop ? "active" : ""}
              onClick={() => onWindowSettings({ ...windowSettings, alwaysOnTop: false })}
            >
              <Monitor size={20} />
              Normal Stack
            </button>
            <button
              className={windowSettings.alwaysOnTop ? "active" : ""}
              onClick={() => onWindowSettings({ ...windowSettings, alwaysOnTop: true })}
            >
              <Maximize size={20} />
              Keep On Top
            </button>
          </div>
          <div className="speed-grid" aria-label="Window Density">
            <button
              className={!windowSettings.compactMode ? "active" : ""}
              aria-pressed={!windowSettings.compactMode}
              onClick={() => onWindowSettings({ ...windowSettings, compactMode: false })}
            >
              <Monitor size={18} />
              Standard
            </button>
            <button
              className={windowSettings.compactMode ? "active" : ""}
              aria-pressed={windowSettings.compactMode}
              onClick={() => onWindowSettings({ ...windowSettings, compactMode: true })}
            >
              <Gauge size={18} />
              Compact
            </button>
          </div>
        </div>
        <div className="audio-settings">
          <div className="audio-title">
            <strong>Sound</strong>
            <span>{Math.round(audioSettings.volume * 100)}%</span>
          </div>
          <div className="sound-grid">
            <button
              className={audioSettings.enabled ? "active" : ""}
              onClick={() => onAudio({ ...audioSettings, enabled: true })}
            >
              <Volume2 size={20} />
              Sound On
            </button>
            <button
              className={!audioSettings.enabled ? "active" : ""}
              onClick={() => onAudio({ ...audioSettings, enabled: false })}
            >
              <VolumeX size={20} />
              Sound Off
            </button>
          </div>
          <input
            aria-label="Sound volume"
            type="range"
            min="0"
            max="100"
            value={Math.round(audioSettings.volume * 100)}
            onChange={(event) => onAudio({ ...audioSettings, volume: Number(event.currentTarget.value) / 100 })}
          />
        </div>
        <div className="runtime-settings">
          <div className="audio-title">
            <strong>Runtime</strong>
            <span>
              {runtimeSettings.lowPower ? "Low Power" : "Full Rate"} · {runtimeSettings.battleSpeed}x
            </span>
          </div>
          <div className="sound-grid">
            <button
              className={!runtimeSettings.lowPower ? "active" : ""}
              onClick={() => onRuntime({ ...runtimeSettings, lowPower: false })}
            >
              <Activity size={20} />
              Full Rate
            </button>
            <button
              className={runtimeSettings.lowPower ? "active" : ""}
              onClick={() => onRuntime({ ...runtimeSettings, lowPower: true })}
            >
              <Gauge size={20} />
              Low Power
            </button>
          </div>
          <div className="speed-grid" aria-label="Battle Speed">
            <button
              className={runtimeSettings.battleSpeed === 1 ? "active" : ""}
              aria-pressed={runtimeSettings.battleSpeed === 1}
              onClick={() => onRuntime({ ...runtimeSettings, battleSpeed: 1 })}
            >
              <Gauge size={18} />
              1x
            </button>
            <button
              className={runtimeSettings.battleSpeed === 2 ? "active" : ""}
              aria-pressed={runtimeSettings.battleSpeed === 2}
              onClick={() => onRuntime({ ...runtimeSettings, battleSpeed: 2 })}
            >
              <Zap size={18} />
              2x
            </button>
          </div>
        </div>
        <div className="save-tools">
          <div>
            <strong>Save Backup</strong>
            <span>Move progress between local installs.</span>
          </div>
          <div className="save-tool-actions">
            <button type="button" onClick={onSaveNow} disabled={saveBlocked}>
              <Save size={18} />
              Save Now
            </button>
            <button type="button" onClick={onExport} disabled={saveBlocked}>
              <Download size={18} />
              Export Save
            </button>
            <button type="button" className="secondary" onClick={onImportClick}>
              <Upload size={18} />
              Import Save
            </button>
            <button type="button" className="secondary" onClick={onRestoreBackup}>
              <ShieldCheck size={18} />
              Restore Backup
            </button>
          </div>
          <input
            ref={importInputRef}
            aria-label="Import save file"
            className="file-input"
            type="file"
            accept="application/json,.json"
            onChange={(event) => onImportFile(event.currentTarget.files?.[0] ?? null)}
          />
        </div>
        <div className="diagnostics-tools">
          <div>
            <strong>Support Snapshot</strong>
            <span>Build State</span>
          </div>
          <button type="button" className="wide secondary" onClick={onDiagnostics}>
            <FileText size={18} />
            Export Diagnostics
          </button>
        </div>
        <div className="build-info" aria-label="Build information">
          <div>
            <span>Version</span>
            <strong>{appBuildInfo.version}</strong>
          </div>
          <div>
            <span>Bundle</span>
            <strong>{appBuildInfo.bundleId}</strong>
          </div>
          <div>
            <span>Build</span>
            <strong>{appBuildInfo.releaseChannel}</strong>
          </div>
        </div>
        <div className="asset-provenance" aria-label="Asset provenance">
          <div>
            <span>Assets</span>
            <strong>Generated in-project</strong>
          </div>
          <p>Hero, enemies, bosses, attack FX, background, and app icon are local generated assets with no runtime external sprite dependency.</p>
        </div>
        <button className="secondary wide" onClick={onClose} disabled={saveBlocked}>
          Return
        </button>
      </div>
    </section>
  );
}

function Resource({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="resource-pill">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Bar({
  label,
  value,
  percent,
  tone
}: {
  label: string;
  value: string;
  percent: number;
  tone: "green" | "blue" | "red" | "amber";
}) {
  return (
    <div className="bar-block">
      <div className="bar-label">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className={`bar-track ${tone}`}>
        <div style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="stat-tile">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function UpgradeRow({
  title,
  level,
  detail,
  preview,
  cost,
  disabled,
  onBuy
}: {
  title: string;
  level: number;
  detail: string;
  preview: ReturnType<typeof deriveUpgradePreview>;
  cost: string;
  disabled: boolean;
  onBuy: () => void;
}) {
  return (
    <article className="upgrade-row">
      <div>
        <div className="upgrade-title">
          <strong>{title}</strong>
          <span>Lv. {level}</span>
        </div>
        <p>{detail}</p>
        <div className="upgrade-preview">
          <span>{preview.effectLabel}</span>
          <span>Power +{formatNumber(preview.powerGain)}</span>
        </div>
      </div>
      <button disabled={disabled} onClick={onBuy}>
        {cost}
      </button>
    </article>
  );
}

function drawBattleScene(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: GameState,
  stats: ReturnType<typeof deriveStats>,
  frame: number,
  sprites: SpriteImages | null
) {
  const width = canvas.width;
  const height = canvas.height;
  const pulse = Math.sin(frame / 18);
  context.clearRect(0, 0, width, height);

  if (sprites?.background?.complete) {
    const sourceW = sprites.background.width;
    const sourceH = sprites.background.height;
    const cropW = Math.min(sourceW, sourceH * (width / height));
    const cropX = (sourceW - cropW) / 2 + Math.sin(frame / 600) * 12;
    context.drawImage(sprites.background, cropX, 0, cropW, sourceH, 0, 0, width, height);
    context.fillStyle = "rgba(8, 13, 20, 0.28)";
    context.fillRect(0, 0, width, height);
  } else {
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#15130f");
    gradient.addColorStop(0.55, "#25302d");
    gradient.addColorStop(1, "#472719");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }

  context.fillStyle = "rgba(255, 186, 93, 0.08)";
  for (let i = 0; i < 34; i += 1) {
    const x = (i * 97 + frame * 0.18) % width;
    const y = 40 + ((i * 53) % 210);
    context.fillRect(x, y, 2, 2);
  }

  context.fillStyle = "rgba(41, 32, 24, 0.55)";
  context.fillRect(0, 304, width, 116);
  context.fillStyle = "rgba(220, 141, 61, 0.35)";
  context.fillRect(0, 304, width, 7);
  context.fillStyle = "rgba(97, 67, 45, 0.55)";
  for (let x = 0; x < width; x += 64) {
    context.fillRect(x, 332, 36, 3);
    context.fillRect(x + 48, 376, 44, 3);
  }

  const heroX = 190 + pulse * 5;
  const enemyX = 560 - pulse * 4;
  const enemySprite = selectEnemySprite(sprites, stats);
  drawHero(context, heroX, 238, frame, sprites?.hero);
  drawEnemy(context, enemyX, 242, stats.stageBoss, frame, state, stats, enemySprite);

  const slash = (frame % 40) / 40;
  if (slash < 0.24) {
    drawAttackEffect(context, heroX, enemyX, slash, sprites?.attack);
  }

  context.fillStyle = "rgba(8, 12, 16, 0.58)";
  context.fillRect(20, 18, 212, 54);
  context.fillRect(width - 252, 18, 232, 54);
  context.fillStyle = "rgba(255, 221, 164, 0.88)";
  context.font = "700 15px Inter, system-ui, sans-serif";
  context.fillText(`Stage ${state.stage} / ${stats.stageCap}`, 34, 42);
  context.font = "600 12px Inter, system-ui, sans-serif";
  context.fillText(stats.regionName, 34, 60);
  context.font = "700 15px Inter, system-ui, sans-serif";
  context.fillText(stats.enemyName, width - 238, 42);
  context.font = "600 12px Inter, system-ui, sans-serif";
  context.fillText(
    state.campaignCleared ? "Route complete" : stats.stageBoss ? "Boss pressure active" : `Next boss: ${stats.nextBossStage}`,
    width - 238,
    60
  );
}

function selectEnemySprite(sprites: SpriteImages | null, stats: ReturnType<typeof deriveStats>) {
  if (!sprites) {
    return undefined;
  }
  if (stats.stageBoss) {
    return sprites.bosses[stats.enemyVariantIndex % sprites.bosses.length];
  }
  return sprites.enemies[stats.enemyVariantIndex % sprites.enemies.length];
}

function drawHero(context: CanvasRenderingContext2D, x: number, y: number, frame: number, sprite?: HTMLImageElement) {
  const bob = Math.sin(frame / 12) * 3;
  context.fillStyle = "rgba(95, 211, 255, 0.18)";
  context.beginPath();
  context.ellipse(x + 18, y + 74, 68, 16, 0, 0, Math.PI * 2);
  context.fill();
  if (sprite?.complete) {
    const drawHeight = 142;
    const drawWidth = drawHeight * (sprite.width / sprite.height);
    context.imageSmoothingEnabled = true;
    context.drawImage(sprite, x - drawWidth / 2, y - 78 + bob, drawWidth, drawHeight);
    context.imageSmoothingEnabled = true;
    return;
  }
  context.fillStyle = "#ffe0ad";
  context.fillRect(x - 16, y - 52 + bob, 34, 34);
  context.fillStyle = "#5fd3ff";
  context.fillRect(x - 34, y - 16 + bob, 72, 82);
  context.fillStyle = "#20324a";
  context.fillRect(x - 42, y + 56 + bob, 28, 52);
  context.fillRect(x + 14, y + 56 + bob, 28, 52);
  context.fillStyle = "#f5c15b";
  context.fillRect(x - 44, y - 2 + bob, 18, 62);
  context.fillStyle = "#d95f5f";
  context.fillRect(x + 35, y - 5 + bob, 16, 80);
  context.fillStyle = "#ffffff";
  context.fillRect(x - 8, y - 40 + bob, 7, 7);
  context.fillRect(x + 9, y - 40 + bob, 7, 7);
}

function drawEnemy(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  boss: boolean,
  frame: number,
  state: GameState,
  stats: ReturnType<typeof deriveStats>,
  sprite?: HTMLImageElement
) {
  const bob = Math.cos(frame / 15) * 4;
  const variant = (state.enemySeed + stats.regionIndex * 3 + (boss ? state.bossesDefeated : 0)) % 5;
  const scale = boss ? 1.24 + variant * 0.025 : 0.92 + variant * 0.055;
  const hue = stats.regionIndex * 22 + variant * 9;
  const brightness = boss ? 0.94 + variant * 0.03 : 0.86 + variant * 0.04;
  context.fillStyle = boss ? "rgba(255, 95, 132, 0.2)" : "rgba(255, 190, 95, 0.16)";
  context.beginPath();
  context.ellipse(x, y + 78, 76 * scale, 18, 0, 0, Math.PI * 2);
  context.fill();
  if (boss) {
    context.strokeStyle = `rgba(255, 95, 132, ${0.25 + Math.sin(frame / 10) * 0.1})`;
    context.lineWidth = 3;
    context.beginPath();
    context.ellipse(x, y + 12, 92 * scale, 128 * scale, 0, 0, Math.PI * 2);
    context.stroke();
  }
  if (sprite?.complete) {
    const drawHeight = boss ? 212 : 142;
    const drawWidth = drawHeight * (sprite.width / sprite.height);
    context.imageSmoothingEnabled = true;
    context.filter = `hue-rotate(${hue}deg) saturate(${boss ? 1.12 : 1 + variant * 0.07}) brightness(${brightness})`;
    context.drawImage(sprite, x - drawWidth / 2, y - (boss ? 140 : 76) + bob, drawWidth, drawHeight);
    context.filter = "none";
    context.imageSmoothingEnabled = true;
    return;
  }
  context.fillStyle = boss ? "#d95f72" : "#9b7cff";
  context.fillRect(x - 45 * scale, y - 42 * scale + bob, 90 * scale, 112 * scale);
  context.fillStyle = boss ? "#ffbd5b" : "#b8ffdc";
  context.fillRect(x - 24 * scale, y - 18 * scale + bob, 13 * scale, 13 * scale);
  context.fillRect(x + 12 * scale, y - 18 * scale + bob, 13 * scale, 13 * scale);
  context.fillStyle = "#1a1730";
  context.fillRect(x - 20 * scale, y + 18 * scale + bob, 40 * scale, 8 * scale);
  if (boss) {
    context.fillStyle = "#ffd166";
    context.fillRect(x - 58 * scale, y - 74 * scale + bob, 116 * scale, 16 * scale);
  }
}

function drawAttackEffect(
  context: CanvasRenderingContext2D,
  heroX: number,
  enemyX: number,
  slash: number,
  sprite?: HTMLImageElement
) {
  const alpha = Math.max(0, 1 - slash * 3.1);
  if (sprite?.complete) {
    const width = 230 + slash * 60;
    const height = width * (sprite.height / sprite.width);
    context.save();
    context.globalAlpha = alpha;
    context.translate(heroX + 170 + slash * 160, 178 + slash * 38);
    context.rotate(-0.08 + slash * 0.12);
    context.drawImage(sprite, -width / 2, -height / 2, width, height);
    context.restore();
    return;
  }

  context.strokeStyle = `rgba(255, 190, 95, ${alpha})`;
  context.lineWidth = 8;
  context.beginPath();
  context.moveTo(heroX + 58 + slash * 220, 168 + slash * 90);
  context.lineTo(enemyX + 40, 116 + slash * 38);
  context.stroke();
}

function gearDetail(key: GearKey) {
  if (key === "blade") {
    return "Raises auto-attack damage and clear speed.";
  }
  if (key === "armor") {
    return "Raises max HP and reduces incoming damage.";
  }
  if (key === "banner") {
    return "Raises gold income from every defeated enemy.";
  }
  if (key === "goggles") {
    return "Improves crit chance and bounty efficiency.";
  }
  return "Raises damage, armor stability, and overdrive tempo.";
}

function skillDetail(key: SkillKey) {
  if (key === "cleave") {
    return "Adds crit chance and wave damage scaling.";
  }
  if (key === "bulwark") {
    return "Improves idle survivability and recovery.";
  }
  if (key === "treasury") {
    return "Improves gold routing during active and offline play.";
  }
  if (key === "pressure") {
    return "Charges overdrive faster and raises burst damage.";
  }
  return "Improves boss relic flow and resource cleanup.";
}

function formatCost(
  primary: number,
  primaryLabel: string,
  secondary: number,
  secondaryLabel: string,
  tertiary = 0,
  tertiaryLabel = ""
) {
  return [
    `${formatNumber(primary)} ${primaryLabel}`,
    secondary > 0 ? `${formatNumber(secondary)} ${secondaryLabel}` : "",
    tertiary > 0 ? `${formatNumber(tertiary)} ${tertiaryLabel}` : ""
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatReward(reward: ContractReward) {
  return [
    reward.gold ? `${formatNumber(reward.gold)} gold` : "",
    reward.parts ? `${formatNumber(reward.parts)} parts` : "",
    reward.essence ? `${formatNumber(reward.essence)} essence` : "",
    reward.relics ? `${formatNumber(reward.relics)} relics` : "",
    reward.levelPoints ? `${formatNumber(reward.levelPoints)} talent` : ""
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1
  }).format(Math.floor(value));
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
