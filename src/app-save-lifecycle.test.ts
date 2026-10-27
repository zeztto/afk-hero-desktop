import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(path.join(process.cwd(), "src", "App.tsx"), "utf8");

describe("app save lifecycle", () => {
  it("flushes progress on autosave and window lifecycle exits", () => {
    expect(appSource).toContain("const flushSave = useCallback");
    expect(appSource).toContain("const savePendingRef = useRef(false)");
    expect(appSource).toContain("function setNativeSavePending(pending: boolean)");
    expect(appSource).toContain("savePendingRef.current = true");
    expect(appSource).toContain("setNativeSavePending(true)");
    expect(appSource).toContain("setNativeSavePending(false)");
    expect(appSource).toContain('if (command === "save-now")');
    expect(appSource).toContain('flushSave("Saving now")');
    expect(appSource).toContain("window.setInterval(() => {");
    expect(appSource).toContain("flushSave();");
    expect(appSource).toContain('document.addEventListener("visibilitychange", syncRuntime)');
    expect(appSource).toContain('flushSave("Saving progress")');
    expect(appSource).toContain('window.addEventListener("pagehide", flushBeforeExit)');
    expect(appSource).toContain('window.addEventListener("beforeunload", flushBeforeExit)');
    expect(appSource).toContain('window.removeEventListener("pagehide", flushBeforeExit)');
    expect(appSource).toContain('window.removeEventListener("beforeunload", flushBeforeExit)');
  });
});
