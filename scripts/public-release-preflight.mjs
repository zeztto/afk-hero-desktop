import { access, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactDir = path.join(root, "qa-artifacts");
const appPath = path.join(root, "release", "mac-arm64", "AFK HERO.app");
const dmgPath = path.join(root, "release", "AFK HERO-1.0.0-arm64.dmg");
const zipPath = path.join(root, "release", "AFK HERO-1.0.0-arm64.zip");
const reportPath = path.join(artifactDir, "public-release-preflight.json");

const checks = [];

await checkFile("mac app artifact", appPath);
await checkFile("dmg artifact", dmgPath);
await checkFile("zip artifact", zipPath);
checkCredentialContract();
await checkCodeSignature();
await checkGatekeeperAssessment();
await checkStapler("app notarization ticket", appPath);
await checkStapler("dmg notarization ticket", dmgPath);

const passed = checks.every((check) => check.ok);
await mkdir(artifactDir, { recursive: true });
await writeFile(
  reportPath,
  JSON.stringify(
    {
      passed,
      checkedAt: new Date().toISOString(),
      appPath,
      dmgPath,
      zipPath,
      checks
    },
    null,
    2
  ),
  "utf8"
);

if (!passed) {
  console.error(`Public release preflight failed. Report: ${reportPath}`);
  for (const check of checks.filter((entry) => !entry.ok)) {
    console.error(`- ${check.name}: ${check.message}`);
  }
  process.exit(1);
}

console.log(`Public release preflight passed. Report: ${reportPath}`);

async function checkFile(name, filePath) {
  try {
    await access(filePath, constants.R_OK);
    checks.push({ name, ok: true, message: filePath });
  } catch {
    checks.push({ name, ok: false, message: `Missing readable artifact: ${filePath}` });
  }
}

function checkCredentialContract() {
  const hasCscName = Boolean(process.env.CSC_NAME);
  const hasApiKeyFlow = Boolean(process.env.APPLE_API_KEY && process.env.APPLE_API_KEY_ID && process.env.APPLE_API_ISSUER);
  const hasAppleIdFlow = Boolean(
    process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD && process.env.APPLE_TEAM_ID
  );

  checks.push({
    name: "Developer ID signing environment",
    ok: hasCscName,
    message: hasCscName ? "CSC_NAME is present" : "CSC_NAME is required for public Developer ID signing"
  });

  checks.push({
    name: "Apple notarization environment",
    ok: hasApiKeyFlow || hasAppleIdFlow,
    message:
      hasApiKeyFlow || hasAppleIdFlow
        ? "notarization credential group is present"
        : "Provide APPLE_API_KEY + APPLE_API_KEY_ID + APPLE_API_ISSUER, or APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD + APPLE_TEAM_ID"
  });
}

async function checkCodeSignature() {
  const verify = await run("codesign", ["--verify", "--deep", "--strict", "--verbose=2", appPath]);
  checks.push({
    name: "codesign strict verification",
    ok: verify.ok,
    message: summarizeCommand(verify)
  });

  const details = await run("codesign", ["-dv", "--verbose=4", appPath]);
  const signatureText = `${details.stdout}\n${details.stderr}`;
  const developerSigned = /Authority=Developer ID Application/i.test(signatureText);
  const adHocSigned = /Signature=adhoc/i.test(signatureText);
  checks.push({
    name: "Developer ID signature",
    ok: details.ok && developerSigned && !adHocSigned,
    message: developerSigned
      ? "Developer ID Application authority found"
      : adHocSigned
        ? "App is ad-hoc signed"
        : "Developer ID Application authority not found"
  });
}

async function checkGatekeeperAssessment() {
  const assessment = await run("spctl", ["--assess", "--type", "execute", "--verbose=4", appPath]);
  checks.push({
    name: "Gatekeeper assessment",
    ok: assessment.ok,
    message: summarizeCommand(assessment)
  });
}

async function checkStapler(name, targetPath) {
  const stapler = await run("xcrun", ["stapler", "validate", targetPath]);
  checks.push({
    name,
    ok: stapler.ok,
    message: summarizeCommand(stapler)
  });
}

function run(command, args) {
  return new Promise((resolve) => {
    execFile(command, args, { cwd: root, timeout: 120_000 }, (error, stdout, stderr) => {
      resolve({
        command: [command, ...args].join(" "),
        ok: !error,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: error?.code ?? 0
      });
    });
  });
}

function summarizeCommand(result) {
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  return output || `exit ${result.exitCode}`;
}
