const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("afkHeroStore", {
  load: () => ipcRenderer.invoke("save:load"),
  write: (state, options) => ipcRenderer.invoke("save:write", state, options),
  restoreBackup: () => ipcRenderer.invoke("save:restore-backup"),
  reset: () => ipcRenderer.invoke("save:reset")
});

contextBridge.exposeInMainWorld("afkHeroWindow", {
  setDisplayMode: (mode) => ipcRenderer.invoke("window:set-display-mode", mode),
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke("window:set-always-on-top", enabled),
  setCompactMode: (enabled) => ipcRenderer.invoke("window:set-compact-mode", enabled),
  getDisplayState: () => ipcRenderer.invoke("window:get-display-state")
});

contextBridge.exposeInMainWorld("afkHeroLifecycle", {
  setSavePending: (pending) => ipcRenderer.invoke("lifecycle:set-save-pending", pending)
});

contextBridge.exposeInMainWorld("afkHeroMenu", {
  onCommand: (callback) => {
    if (typeof callback !== "function") {
      return () => {};
    }
    const allowedCommands = new Set(["open-settings", "save-now", "display-windowed", "display-borderless", "display-fullscreen"]);
    const listener = (_event, command) => {
      if (allowedCommands.has(command)) {
        callback(command);
      }
    };
    ipcRenderer.on("menu:command", listener);
    return () => ipcRenderer.removeListener("menu:command", listener);
  }
});
