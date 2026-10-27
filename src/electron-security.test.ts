import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const mainSource = readFileSync(path.join(process.cwd(), "electron", "main.cjs"), "utf8");
const preloadSource = readFileSync(path.join(process.cwd(), "electron", "preload.cjs"), "utf8");

describe("Electron security boundary", () => {
  it("keeps the renderer isolated, sandboxed, and without Node integration", () => {
    expect(mainSource).toContain("contextIsolation: true");
    expect(mainSource).toContain("nodeIntegration: false");
    expect(mainSource).toContain("sandbox: true");
    expect(mainSource).toContain("webSecurity: true");
    expect(mainSource).toContain("allowRunningInsecureContent: false");
  });

  it("blocks untrusted navigation and new windows", () => {
    expect(mainSource).toContain("setWindowOpenHandler(() => ({ action: \"deny\" }))");
    expect(mainSource).toContain("will-navigate");
    expect(mainSource).toContain("isAllowedNavigation");
  });

  it("keeps IPC bridges narrow and validates display mode inputs", () => {
    expect(preloadSource).toContain("contextBridge.exposeInMainWorld(\"afkHeroStore\"");
    expect(preloadSource).toContain("restoreBackup: () => ipcRenderer.invoke(\"save:restore-backup\")");
    expect(preloadSource).toContain("contextBridge.exposeInMainWorld(\"afkHeroWindow\"");
    expect(preloadSource).toContain("setAlwaysOnTop: (enabled) => ipcRenderer.invoke(\"window:set-always-on-top\", enabled)");
    expect(preloadSource).toContain("setCompactMode: (enabled) => ipcRenderer.invoke(\"window:set-compact-mode\", enabled)");
    expect(preloadSource).toContain("contextBridge.exposeInMainWorld(\"afkHeroLifecycle\"");
    expect(preloadSource).toContain("setSavePending: (pending) => ipcRenderer.invoke(\"lifecycle:set-save-pending\", pending)");
    expect(preloadSource).toContain("contextBridge.exposeInMainWorld(\"afkHeroMenu\"");
    expect(preloadSource).not.toContain("exposeInMainWorld(\"electron\"");
    expect(preloadSource).not.toContain("sendSync");
    expect(mainSource).toContain("allowedDisplayModes");
    expect(mainSource).toContain("allowedDisplayModes.has(mode)");
    expect(mainSource).toContain("typeof enabled !== \"boolean\"");
    expect(mainSource).toContain("window:set-always-on-top");
    expect(mainSource).toContain("window:set-compact-mode");
    expect(mainSource).toContain("{ width: 960, height: 540 }");
    expect(mainSource).toContain("lifecycle:set-save-pending");
    expect(mainSource).toContain("typeof pending !== \"boolean\"");
    expect(mainSource).toContain("allowedMenuCommands");
    expect(preloadSource).toContain("allowedCommands.has(command)");
  });

  it("keeps a native app menu for desktop commands without enabling renderer privileges", () => {
    expect(mainSource).toContain("createApplicationMenu");
    expect(mainSource).toContain("Settings...");
    expect(mainSource).toContain("Save Now");
    expect(mainSource).toContain("save-now");
    expect(mainSource).toContain("display-windowed");
    expect(mainSource).toContain("Menu.setApplicationMenu(createApplicationMenu())");
    expect(mainSource).not.toContain("Menu.setApplicationMenu(null)");
  });

  it("keeps a macOS menu bar status item on the same command whitelist", () => {
    expect(mainSource).toContain("Tray, nativeImage");
    expect(mainSource).toContain("let menuBarStatusItem = null");
    expect(mainSource).toContain("function createMenuBarStatusItem()");
    expect(mainSource).toContain("getMenuBarIconPath");
    expect(mainSource).toContain("Open AFK HERO");
    expect(mainSource).toContain("AFK HERO Running");
    expect(mainSource).toContain("Quit AFK HERO");
    expect(mainSource).toContain("createMenuBarStatusItem()");
    expect(mainSource).toContain("sendMenuCommand(\"save-now\")");
    expect(mainSource).toContain("sendMenuCommand(\"display-windowed\")");
  });

  it("confirms window close only while native save is pending", () => {
    expect(mainSource).toContain("pendingSaveWindows");
    expect(mainSource).toContain("window.on(\"close\"");
    expect(mainSource).toContain("Save is still finishing");
    expect(mainSource).toContain("dialog.showMessageBox");
    expect(mainSource).toContain("Quit Anyway");
    expect(mainSource).toContain("window.on(\"closed\"");
  });
});
