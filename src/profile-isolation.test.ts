import { mkdtempSync, rmSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const load = createRequire(import.meta.url);
const main = readFileSync(path.join(process.cwd(), 'electron/main.cjs'), 'utf8');
function startup(profile: string | undefined, fallback: string) {
  const calls: Record<string, string> = {};
  const app = {
    isPackaged: true,
    setName: (name: string) => { calls.name = name; },
    getPath: () => fallback,
    setPath: (key: string, value: string) => { calls[key] = value; },
    setAppLogsPath: (value: string) => { calls.logs = value; },
    whenReady: () => ({ then: () => {} }), on: () => {},
  };
  vm.runInNewContext(main, {
    require: (name: string) => name === 'electron' ? { app } : name.startsWith('./') ? load(path.join(process.cwd(), 'electron', name)) : load(name),
    process: { env: profile === undefined ? {} : { AFK_HERO_USER_DATA_DIR: profile }, platform: process.platform },
    __dirname: path.join(process.cwd(), 'electron'), console, URL,
  });
  return calls;
}

describe('source edition profile isolation before Electron ready', () => {
  it('routes Chromium session, crash dumps, logs and saves to the explicit test profile', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'afk-profile-test-'));
    try {
      const calls = startup(root, path.join(root, 'unused-default'));
      expect(calls.userData).toBe(root);
      expect(calls.sessionData).toBe(path.join(root, 'session'));
      expect(calls.crashDumps).toBe(path.join(root, 'crashes'));
      expect(calls.logs).toBe(path.join(root, 'logs'));
      expect(calls.name).toBe('AFK HERO Source Edition');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
  it('rejects a relative profile instead of writing beside the application', () => {
    expect(() => startup('relative-profile', '/unused')).toThrow('absolute');
  });
});
