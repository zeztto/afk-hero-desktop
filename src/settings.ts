import type { AudioSettings, DisplayMode, RuntimeSettings, WindowSettings } from "./types";

const displayModeKey = "afk-hero-display-mode-v1";
const audioSettingsKey = "afk-hero-audio-settings-v1";
const runtimeSettingsKey = "afk-hero-runtime-settings-v1";
const windowSettingsKey = "afk-hero-window-settings-v1";
const displayModes: DisplayMode[] = ["windowed", "borderless", "fullscreen"];
const defaultAudioSettings: AudioSettings = { enabled: true, volume: 0.42 };
const defaultRuntimeSettings: RuntimeSettings = { lowPower: false, battleSpeed: 1 };
const defaultWindowSettings: WindowSettings = { alwaysOnTop: false, compactMode: false };

export function loadDisplayMode(): DisplayMode {
  try {
    const stored = localStorage.getItem(displayModeKey);
    return isDisplayMode(stored) ? stored : "windowed";
  } catch {
    return "windowed";
  }
}

export function saveDisplayMode(mode: DisplayMode) {
  try {
    localStorage.setItem(displayModeKey, mode);
  } catch {
    return { ok: false };
  }
  return { ok: true };
}

export function loadAudioSettings(): AudioSettings {
  try {
    const stored = localStorage.getItem(audioSettingsKey);
    if (!stored) {
      return defaultAudioSettings;
    }
    return normalizeAudioSettings(JSON.parse(stored));
  } catch {
    return defaultAudioSettings;
  }
}

export function saveAudioSettings(settings: AudioSettings) {
  try {
    localStorage.setItem(audioSettingsKey, JSON.stringify(normalizeAudioSettings(settings)));
  } catch {
    return { ok: false };
  }
  return { ok: true };
}

export function loadRuntimeSettings(): RuntimeSettings {
  try {
    const stored = localStorage.getItem(runtimeSettingsKey);
    if (!stored) {
      return defaultRuntimeSettings;
    }
    return normalizeRuntimeSettings(JSON.parse(stored));
  } catch {
    return defaultRuntimeSettings;
  }
}

export function saveRuntimeSettings(settings: RuntimeSettings) {
  try {
    localStorage.setItem(runtimeSettingsKey, JSON.stringify(normalizeRuntimeSettings(settings)));
  } catch {
    return { ok: false };
  }
  return { ok: true };
}

export function loadWindowSettings(): WindowSettings {
  try {
    const stored = localStorage.getItem(windowSettingsKey);
    if (!stored) {
      return defaultWindowSettings;
    }
    return normalizeWindowSettings(JSON.parse(stored));
  } catch {
    return defaultWindowSettings;
  }
}

export function saveWindowSettings(settings: WindowSettings) {
  try {
    localStorage.setItem(windowSettingsKey, JSON.stringify(normalizeWindowSettings(settings)));
  } catch {
    return { ok: false };
  }
  return { ok: true };
}

export function normalizeAudioSettings(value: unknown): AudioSettings {
  if (!value || typeof value !== "object") {
    return defaultAudioSettings;
  }
  const candidate = value as Partial<AudioSettings>;
  const enabled = typeof candidate.enabled === "boolean" ? candidate.enabled : defaultAudioSettings.enabled;
  const volume = typeof candidate.volume === "number" && Number.isFinite(candidate.volume)
    ? Math.max(0, Math.min(1, candidate.volume))
    : defaultAudioSettings.volume;
  return { enabled, volume };
}

export function normalizeRuntimeSettings(value: unknown): RuntimeSettings {
  if (!value || typeof value !== "object") {
    return defaultRuntimeSettings;
  }
  const candidate = value as Partial<RuntimeSettings>;
  return {
    lowPower: typeof candidate.lowPower === "boolean" ? candidate.lowPower : defaultRuntimeSettings.lowPower,
    battleSpeed: candidate.battleSpeed === 2 ? 2 : defaultRuntimeSettings.battleSpeed
  };
}

export function normalizeWindowSettings(value: unknown): WindowSettings {
  if (!value || typeof value !== "object") {
    return defaultWindowSettings;
  }
  const candidate = value as Partial<WindowSettings>;
  return {
    alwaysOnTop: typeof candidate.alwaysOnTop === "boolean" ? candidate.alwaysOnTop : defaultWindowSettings.alwaysOnTop,
    compactMode: typeof candidate.compactMode === "boolean" ? candidate.compactMode : defaultWindowSettings.compactMode
  };
}

export function isDisplayMode(value: unknown): value is DisplayMode {
  return typeof value === "string" && displayModes.includes(value as DisplayMode);
}
