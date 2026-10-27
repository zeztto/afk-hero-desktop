import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const root = process.cwd();
const artifactDir = path.join(root, "qa-artifacts");
const reportPath = path.join(artifactDir, "release-config-check.json");
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const builderConfig = JSON.parse(await readFile(path.join(root, "electron-builder.json"), "utf8"));
const gitignore = await readText(".gitignore");
const releaseEnvExample = await readText(".env.release.example");
const entitlementsText = await readText(builderConfig.mac?.entitlements ?? "");
const failures = [];

expect(builderConfig.appId === "dev.zeztto.afkhero.source", `Unexpected appId: ${builderConfig.appId}`);
expect(builderConfig.productName === "AFK HERO", `Unexpected productName: ${builderConfig.productName}`);
expect(builderConfig.asar === true, "electron-builder must package renderer in app.asar");
expect(builderConfig.icon === "build/icon.icns", `electron-builder icon must be build/icon.icns, got ${builderConfig.icon}`);
expect(builderConfig.artifactName === "${productName}-${version}-${arch}.${ext}", "artifactName must include product/version/arch/ext");
expect(builderConfig.mac?.category === "public.app-category.games", "mac.category must be public.app-category.games");
expect(builderConfig.mac?.hardenedRuntime === true, "mac.hardenedRuntime must be true for hardened macOS packaging");
expect(builderConfig.mac?.entitlements === "build/entitlements.mac.plist", "mac.entitlements must use build/entitlements.mac.plist");
expect(
  builderConfig.mac?.entitlementsInherit === builderConfig.mac?.entitlements,
  "mac.entitlementsInherit must match mac.entitlements"
);
expect(builderConfig.mac?.notarize === true, "mac.notarize must stay ready for optional credential-triggered notarization");
expect(builderConfig.mac?.gatekeeperAssess === false, "mac.gatekeeperAssess must stay false; public preflight owns Gatekeeper validation");
expect(Array.isArray(builderConfig.mac?.target), "mac.target must be an array");
expect(builderConfig.mac?.target?.includes("dmg"), "mac.target must include dmg");
expect(builderConfig.mac?.target?.includes("zip"), "mac.target must include zip");
expect(builderConfig.dmg?.artifactName === "${productName}-${version}-${arch}.${ext}", "dmg.artifactName must match release artifact contract");

await expectReadable("build/icon.icns");
await expectReadable("build/entitlements.mac.plist");
for (const entitlementKey of [
  "com.apple.security.cs.allow-jit",
  "com.apple.security.cs.allow-unsigned-executable-memory",
  "com.apple.security.cs.disable-library-validation"
]) {
  expect(entitlementsText.includes(entitlementKey), `Missing entitlement key: ${entitlementKey}`);
}

for (const key of [
  "CSC_NAME",
  "APPLE_API_KEY",
  "APPLE_API_KEY_ID",
  "APPLE_API_ISSUER",
  "APPLE_ID",
  "APPLE_APP_SPECIFIC_PASSWORD",
  "APPLE_TEAM_ID"
]) {
  expect(releaseEnvExample.includes(`${key}=`), `.env.release.example missing ${key}`);
}
expect(gitignore.split(/\r?\n/).includes(".env.release"), ".gitignore must exclude .env.release");
expect(packageJson.scripts["release:public:env"]?.includes("run-with-release-env"), "release:public:env must load .env.release");
expect(
  packageJson.scripts["release:public:preflight:env"]?.includes("run-with-release-env"),
  "release:public:preflight:env must load .env.release"
);
expect(packageJson.scripts["release:check"]?.includes("release:config"), "release:check must include release:config");

const report = {
  ok: failures.length === 0,
  checkedAt: new Date().toISOString(),
  package: {
    version: packageJson.version,
    scripts: {
      releaseCheck: packageJson.scripts["release:check"],
      releasePublicEnv: packageJson.scripts["release:public:env"],
      releasePublicPreflightEnv: packageJson.scripts["release:public:preflight:env"]
    }
  },
  builder: {
    appId: builderConfig.appId,
    productName: builderConfig.productName,
    asar: builderConfig.asar,
    icon: builderConfig.icon,
    mac: builderConfig.mac,
    dmg: builderConfig.dmg
  },
  failures
};

await mkdir(artifactDir, { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (!report.ok) {
  console.error(`Release config check failed. Report: ${reportPath}`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Release config check passed.");
console.log(`Report: ${reportPath}`);

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

async function expectReadable(relativePath) {
  try {
    await access(path.join(root, relativePath), constants.R_OK);
  } catch {
    failures.push(`Missing readable file: ${relativePath}`);
  }
}

async function readText(relativePath) {
  if (!relativePath) {
    return "";
  }
  try {
    return await readFile(path.join(root, relativePath), "utf8");
  } catch {
    failures.push(`Missing readable file: ${relativePath}`);
    return "";
  }
}
