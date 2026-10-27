const { app, BrowserWindow, Menu, ipcMain, dialog, Tray, nativeImage } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { normalizeSavePayloadForDisk, shouldReplaceBackupSnapshot } = require("./save-guard.cjs");

// Source edition never shares the installed original application's profile.
app.setName("AFK HERO Source Edition");
const requestedProfile = process.env.AFK_HERO_USER_DATA_DIR;
if (requestedProfile && !path.isAbsolute(requestedProfile)) {
  throw new TypeError("AFK_HERO_USER_DATA_DIR must be an absolute path");
}
const profilePath = requestedProfile || app.getPath("userData");
const profileDirectories = {
  userData: profilePath,
  sessionData: path.join(profilePath, "session"),
  crashDumps: path.join(profilePath, "crashes")
};
for (const [key, directory] of Object.entries(profileDirectories)) {
  require("node:fs").mkdirSync(directory, { recursive: true, mode: 0o700 });
  app.setPath(key, directory);
}
const profileLogs = path.join(profilePath, "logs");
require("node:fs").mkdirSync(profileLogs, { recursive: true, mode: 0o700 });
app.setAppLogsPath(profileLogs);

const isDev = process.env.VITE_DEV_SERVER_URL || !app.isPackaged;
const aspectRatio = 16 / 9;
const allowedDisplayModes = new Set(["windowed", "borderless", "fullscreen"]);
const allowedMenuCommands = new Set(["open-settings", "save-now", "display-windowed", "display-borderless", "display-fullscreen"]);
let saveOperationQueue = Promise.resolve();
function withSaveLock(operation) {
  const result = saveOperationQueue.then(operation);
  // Keep later recovery operations runnable after a rejected disk operation.
  saveOperationQueue = result.catch(() => {});
  return result;
}

const pendingSaveWindows = new WeakMap();
const closeConfirmedWindows = new WeakSet();
let menuBarStatusItem = null;

function setSimpleFullScreen(window, enabled) {
  if (process.platform === "darwin" && typeof window.setSimpleFullScreen === "function") {
    window.setSimpleFullScreen(enabled);
  }
}

function isSimpleFullScreen(window) {
  if (process.platform === "darwin" && typeof window.isSimpleFullScreen === "function") {
    return window.isSimpleFullScreen();
  }
  return false;
}

function waitForWindowTransition(ms = 350) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getDisplayState(window) {
  const [width, height] = window.getSize();
  return {
    isFullScreen: window.isFullScreen(),
    isSimpleFullScreen: isSimpleFullScreen(window),
    isMaximized: window.isMaximized(),
    isAlwaysOnTop: window.isAlwaysOnTop(),
    width,
    height,
    aspectRatio: width / height
  };
}

function sendMenuCommand(command) {
  if (!allowedMenuCommands.has(command)) {
    return;
  }
  const window = getPrimaryWindow();
  if (window && !window.isDestroyed()) {
    window.show();
    window.focus();
    window.webContents.send("menu:command", command);
  }
}

function getPrimaryWindow() {
  return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows().find((window) => !window.isDestroyed());
}

function openPrimaryWindow() {
  const window = getPrimaryWindow();
  if (window && !window.isDestroyed()) {
    window.show();
    window.focus();
  } else {
    createWindow();
  }
}

function createApplicationMenu() {
  return Menu.buildFromTemplate([
    {
      label: "AFK HERO",
      submenu: [
        { role: "about", label: "About AFK HERO" },
        { type: "separator" },
        {
          label: "Settings...",
          accelerator: "CmdOrCtrl+,",
          click: () => sendMenuCommand("open-settings")
        },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" }
      ]
    },
    {
      label: "File",
      submenu: [
        {
          label: "Save Now",
          accelerator: "CmdOrCtrl+S",
          click: () => sendMenuCommand("save-now")
        }
      ]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [
        {
          label: "Windowed",
          accelerator: "CmdOrCtrl+1",
          click: () => sendMenuCommand("display-windowed")
        },
        {
          label: "Borderless",
          accelerator: "CmdOrCtrl+2",
          click: () => sendMenuCommand("display-borderless")
        },
        {
          label: "Fullscreen",
          accelerator: "CmdOrCtrl+3",
          click: () => sendMenuCommand("display-fullscreen")
        },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "zoom" }, { type: "separator" }, { role: "front" }]
    }
  ]);
}

function getMenuBarIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "icon.icns");
  }
  return path.join(__dirname, "..", "build", "icon.png");
}

function createMenuBarStatusItem() {
  const icon = nativeImage.createFromPath(getMenuBarIconPath());
  menuBarStatusItem = new Tray(icon.resize({ width: 18, height: 18 }));
  menuBarStatusItem.setToolTip("AFK HERO");
  menuBarStatusItem.setContextMenu(Menu.buildFromTemplate([
    { label: "AFK HERO Running", enabled: false },
    { type: "separator" },
    {
      label: "Open AFK HERO",
      click: openPrimaryWindow
    },
    {
      label: "Settings...",
      click: () => sendMenuCommand("open-settings")
    },
    {
      label: "Save Now",
      click: () => sendMenuCommand("save-now")
    },
    { type: "separator" },
    {
      label: "Windowed",
      click: () => sendMenuCommand("display-windowed")
    },
    {
      label: "Borderless",
      click: () => sendMenuCommand("display-borderless")
    },
    {
      label: "Fullscreen",
      click: () => sendMenuCommand("display-fullscreen")
    },
    { type: "separator" },
    { role: "quit", label: "Quit AFK HERO" }
  ]));
  menuBarStatusItem.on("click", openPrimaryWindow);
  return menuBarStatusItem;
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    title: "AFK HERO",
    backgroundColor: "#0b1020",
    fullscreenable: true,
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: isDev,
      preload: path.join(__dirname, "preload.cjs")
    }
  });

  window.setAspectRatio(aspectRatio);
  window.on("close", (event) => {
    if (closeConfirmedWindows.has(window)) {
      closeConfirmedWindows.delete(window);
      return;
    }
    if (!pendingSaveWindows.get(window)) {
      return;
    }
    event.preventDefault();
    void dialog.showMessageBox(window, {
      type: "warning",
      buttons: ["Keep Running", "Quit Anyway"],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
      message: "Save is still finishing",
      detail: "AFK HERO is writing current progress. Quit now only if you are comfortable relying on the last completed autosave."
    }).then((result) => {
      if (result.response === 1 && !window.isDestroyed()) {
        closeConfirmedWindows.add(window);
        window.close();
      }
    });
  });
  window.on("closed", () => {
    pendingSaveWindows.delete(window);
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, targetUrl) => {
    if (!isAllowedNavigation(targetUrl)) {
      event.preventDefault();
    }
  });

  if (isDev) {
    window.loadURL(process.env.VITE_DEV_SERVER_URL || "http://127.0.0.1:5173");
  } else {
    window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

function isAllowedNavigation(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    if (!app.isPackaged && parsed.origin === new URL(process.env.VITE_DEV_SERVER_URL || "http://127.0.0.1:5173").origin) {
      return true;
    }
    return app.isPackaged && parsed.protocol === "file:";
  } catch {
    return false;
  }
}

function getSavePath() {
  return path.join(getUserDataPath(), "save.json");
}

function getUserDataPath() {
  return app.getPath("userData");
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function preserveBackupIfUseful(savePath, backupPath) {
  try {
    const primary = await readJsonFile(savePath);
    let backup = null;
    try {
      backup = await readJsonFile(backupPath);
    } catch {
      backup = null;
    }
    if (shouldReplaceBackupSnapshot(primary, backup)) {
      await fs.copyFile(savePath, backupPath);
    }
  } catch (error) {
    if (!error || error.code !== "ENOENT") {
      throw error;
    }
  }
}

function registerLifecycleHandlers() {
  ipcMain.handle("lifecycle:set-save-pending", (event, pending) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || typeof pending !== "boolean") {
      return { ok: false };
    }
    pendingSaveWindows.set(window, pending);
    return { ok: true };
  });
}

function registerSaveHandlers() {
  ipcMain.handle("save:load", async () => withSaveLock(async () => {
    try {
      const stored = await readJsonFile(getSavePath());
      normalizeSavePayloadForDisk(stored);
      return stored;
    } catch (error) {
      if (error && error.code === "ENOENT") return null;
      throw new Error("Saved progress is unreadable or unsupported; original preserved. Restore Backup, Import Save or Reset Save.");
    }
  }));

  ipcMain.handle("save:write", async (_event, state, options) => withSaveLock(async () => {
    const serialized = normalizeSavePayloadForDisk(state);
    const savePath = getSavePath();
    const tmpPath = `${savePath}.tmp`;
    const backupPath = `${savePath}.backup`;
    await fs.mkdir(path.dirname(savePath), { recursive: true });
    let readable = false;
    try {
      normalizeSavePayloadForDisk(await readJsonFile(savePath));
      readable = true;
    } catch (error) {
      if (!error || error.code !== "ENOENT") {
        if (options?.recover !== true) throw new Error("Save blocked; unreadable original preserved");
        const archivePath = `${savePath}.unreadable-${require("node:crypto").randomUUID()}`;
        await fs.copyFile(savePath, archivePath, require("node:fs").constants.COPYFILE_EXCL);
      }
    }
    if (readable) await preserveBackupIfUseful(savePath, backupPath);
    await fs.writeFile(tmpPath, serialized, "utf8");
    await fs.rename(tmpPath, savePath);
    return { ok: true };
  }));

  ipcMain.handle("save:restore-backup", async () => withSaveLock(async () => {
    const backupPath = `${getSavePath()}.backup`;
    try {
      const backup = await readJsonFile(backupPath);
      normalizeSavePayloadForDisk(backup);
      return { ok: true, state: backup };
    } catch {
      return { ok: false };
    }
  }));

  ipcMain.handle("save:reset", async () => withSaveLock(async () => {
    const savePath = getSavePath();
    try {
      await fs.rm(savePath, { force: true });
      await fs.rm(`${savePath}.backup`, { force: true });
      await fs.rm(`${savePath}.tmp`, { force: true });
    } catch {
      return { ok: false };
    }
    return { ok: true };
  }));
}

function registerWindowHandlers() {
  ipcMain.handle("window:set-display-mode", async (event, mode) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || !allowedDisplayModes.has(mode)) {
      return { ok: false, mode };
    }

    if (mode === "fullscreen") {
      setSimpleFullScreen(window, false);
      window.setAspectRatio(0);
      window.setFullScreen(true);
      await waitForWindowTransition();
      if (!window.isFullScreen()) {
        setSimpleFullScreen(window, true);
        await waitForWindowTransition();
      }
      return { ok: true, mode, state: getDisplayState(window) };
    }

    setSimpleFullScreen(window, false);
    window.setFullScreen(false);
    await waitForWindowTransition();

    if (mode === "borderless") {
      window.setAspectRatio(aspectRatio);
      window.maximize();
      await waitForWindowTransition();
      return { ok: true, mode, state: getDisplayState(window) };
    }

    window.unmaximize();
    await waitForWindowTransition();
    window.setAspectRatio(aspectRatio);
    window.setBounds({ width: 1280, height: 720 }, true);
    window.center();
    await waitForWindowTransition();
    return { ok: true, mode: "windowed", state: getDisplayState(window) };
  });

  ipcMain.handle("window:get-display-state", (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) {
      return { ok: false };
    }
    return { ok: true, state: getDisplayState(window) };
  });

  ipcMain.handle("window:set-always-on-top", (event, enabled) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || typeof enabled !== "boolean") {
      return { ok: false };
    }
    window.setAlwaysOnTop(enabled, "floating");
    return { ok: true, state: getDisplayState(window) };
  });

  ipcMain.handle("window:set-compact-mode", async (event, enabled) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || typeof enabled !== "boolean") {
      return { ok: false };
    }
    setSimpleFullScreen(window, false);
    window.setFullScreen(false);
    await waitForWindowTransition();
    window.unmaximize();
    window.setAspectRatio(aspectRatio);
    window.setBounds(enabled ? { width: 960, height: 540 } : { width: 1280, height: 720 }, true);
    window.center();
    await waitForWindowTransition();
    return { ok: true, state: getDisplayState(window) };
  });
}

app.whenReady().then(() => {
  registerSaveHandlers();
  registerWindowHandlers();
  registerLifecycleHandlers();
  Menu.setApplicationMenu(createApplicationMenu());
  createMenuBarStatusItem();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
