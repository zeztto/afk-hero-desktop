import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { createInitialGameState } from './game';
import { loadGameState, loadGameStateFallback, saveGameState } from './save';

const key = 'afk-hero-save-v1';
const invalid = ['{broken-json', '{"version":999,"gold":54321}', 'null', ''];
function memoryStorage(): Storage {
  const values = new Map<string,string>();
  return { get length() { return values.size; }, clear: () => values.clear(), getItem: key => values.get(key) ?? null, key: index => [...values.keys()][index] ?? null, setItem: (key, value) => { values.set(key,value); }, removeItem: key => { values.delete(key); } };
}

beforeEach(() => { vi.stubGlobal('window', {}); vi.stubGlobal('localStorage', memoryStorage()); });
afterEach(() => vi.unstubAllGlobals());

describe('unreadable save preservation', () => {
  it.each(invalid)('does not replace an unreadable browser save on load or autosave: %j', async raw => {
    localStorage.setItem(key, raw);
    expect(() => loadGameStateFallback(1000)).toThrow();
    await expect(saveGameState(createInitialGameState(1000))).rejects.toThrow();
    expect(localStorage.getItem(key)).toBe(raw);
  });
  it('does not disguise native load failure as a successful browser fallback', async () => {
    const raw = JSON.stringify(createInitialGameState(1000));
    localStorage.setItem(key, raw);
    window.afkHeroStore = { load: vi.fn().mockRejectedValue(new Error('disk unreadable')), write: vi.fn(), reset: vi.fn() };
    await expect(loadGameState(1000)).rejects.toThrow('disk unreadable');
    expect(localStorage.getItem(key)).toBe(raw);
  });
});

// Main-process function contract with real test-only files; this is not native UI evidence.
async function nativeHandlers(root: string, disk?: typeof import("node:fs/promises")) {
  const handlers = new Map<string, (...args: unknown[]) => Promise<unknown>>();
  const load = createRequire(import.meta.url);
  const app = { isPackaged: true, setName: () => {}, getPath: () => root, setPath: () => {}, setAppLogsPath: () => {}, whenReady: () => ({ then: () => {} }), on: () => {} };
  const context = vm.createContext({
    require: (name: string) => name === "node:fs/promises" && disk ? disk : name === 'electron' ? { app, ipcMain: { handle: (name: string, fn: (...args: unknown[]) => Promise<unknown>) => handlers.set(name, fn) } } : name.startsWith('./') ? load(path.join(process.cwd(), 'electron', name)) : load(name),
    process: { env: { AFK_HERO_USER_DATA_DIR: root }, platform: process.platform }, __dirname: path.join(process.cwd(), 'electron'), console, JSON, URL,
  });
  vm.runInContext(readFileSync('electron/main.cjs','utf8'), context);
  vm.runInContext('registerSaveHandlers()', context);
  return handlers;
}

describe('native disk preservation contract', () => {
  it.each(invalid)('blocks unsupported/corrupt native load and automatic write: %j', async raw => {
    const root = await mkdtemp(path.join(tmpdir(), 'afk-save-test-'));
    try {
      await writeFile(path.join(root,'save.json'), raw);
      const h = await nativeHandlers(root);
      await expect(h.get('save:load')!()).rejects.toThrow();
      await expect(h.get('save:write')!({}, createInitialGameState(1000))).rejects.toThrow();
      expect(await readFile(path.join(root,'save.json'),'utf8')).toBe(raw);
    } finally { await rm(root,{recursive:true,force:true}); }
  });
  it('allows deliberate recovery while preserving the unreadable primary bytes', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'afk-recovery-test-'));
    try {
      const raw = '{"version":999,"gold":54321}';
      await writeFile(path.join(root,'save.json'),raw);
      const h = await nativeHandlers(root);
      const recovery = {...createInitialGameState(1000), stage:22, highestStage:22};
      await expect(h.get('save:write')!({}, recovery, {recover:true})).resolves.toEqual({ok:true});
      expect(JSON.parse(await readFile(path.join(root,'save.json'),'utf8')).stage).toBe(22);
      const archived = (await readdir(root)).filter(name => name.startsWith('save.json.unreadable-'));
      expect(archived).toHaveLength(1);
      expect(await readFile(path.join(root,archived[0]),'utf8')).toBe(raw);
    } finally { await rm(root,{recursive:true,force:true}); }
  });
});


it('serializes reset after an in-flight native write without reviving old progress', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'afk-write-order-test-'));
  const disk = await import('node:fs/promises');
  let release: () => void = () => {};
  let started: () => void = () => {};
  let resetEntered = false;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const writing = new Promise<void>(resolve => { started = resolve; });
  const controlled = { ...disk, writeFile: async (...args: Parameters<typeof disk.writeFile>) => { started(); await gate; return disk.writeFile(...args); }, rm: async (...args: Parameters<typeof disk.rm>) => { resetEntered = true; return disk.rm(...args); } };
  try {
    const h = await nativeHandlers(root, controlled);
    const write = h.get('save:write')!({}, createInitialGameState(1000));
    await writing;
    const reset = h.get('save:reset')!();
    try {
      await new Promise<void>(resolve => setImmediate(resolve));
      expect(resetEntered).toBe(false);
    } finally { release(); await Promise.all([write, reset]); }
    await expect(readFile(path.join(root,'save.json'))).rejects.toMatchObject({code:'ENOENT'});
  } finally { release(); await rm(root,{recursive:true,force:true}); }
});
