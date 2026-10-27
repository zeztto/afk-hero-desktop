import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.resolve(root, process.env.AFK_HERO_RELEASE_ENV_FILE ?? ".env.release");
const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  console.error("Usage: node scripts/run-with-release-env.mjs <command> [...args]");
  process.exit(2);
}

try {
  await access(envPath, constants.R_OK);
} catch {
  console.error(`Release env file is missing or unreadable: ${envPath}`);
  console.error("Create it from .env.release.example, then rerun the command. Real values must stay uncommitted.");
  process.exit(1);
}

const releaseEnv = parseDotEnv(await readFile(envPath, "utf8"));
const childEnv = { ...releaseEnv, ...process.env };
const child = spawn(command, args, {
  cwd: root,
  env: childEnv,
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Command terminated by signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 0);
});

function parseDotEnv(source) {
  const parsed = {};
  source.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }
    const separator = trimmed.indexOf("=");
    if (separator < 1) {
      throw new Error(`Invalid .env line ${index + 1}: ${line}`);
    }
    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
      throw new Error(`Invalid env key at line ${index + 1}: ${key}`);
    }
    parsed[key] = unquoteValue(rawValue);
  });
  return parsed;
}

function unquoteValue(value) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
