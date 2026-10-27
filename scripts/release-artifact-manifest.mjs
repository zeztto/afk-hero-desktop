import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const builderConfig = JSON.parse(await readFile(path.join(root, "electron-builder.json"), "utf8"));
const productName = builderConfig.productName ?? packageJson.name;
const arch = "arm64";
const releaseDir = path.join(root, "release");
const appPath = path.join(releaseDir, `mac-${arch}`, `${productName}.app`);
const artifactDir = path.join(root, "qa-artifacts");
const manifestPath = path.join(artifactDir, "release-artifacts.json");

await mkdir(artifactDir, { recursive: true });

const expectedFiles = [
  path.join(releaseDir, `${productName}-${packageJson.version}-${arch}.dmg`),
  path.join(releaseDir, `${productName}-${packageJson.version}-${arch}.dmg.blockmap`),
  path.join(releaseDir, `${productName}-${packageJson.version}-${arch}.zip`),
  path.join(releaseDir, `${productName}-${packageJson.version}-${arch}.zip.blockmap`),
  path.join(appPath, "Contents", "MacOS", productName),
  path.join(appPath, "Contents", "Resources", "app.asar")
];

const artifacts = [];
const failures = [];

for (const filePath of expectedFiles) {
  try {
    await access(filePath, constants.R_OK);
    const fileStat = await stat(filePath);
    if (fileStat.size <= 0) {
      failures.push(`Empty artifact: ${filePath}`);
    }
    artifacts.push({
      path: filePath,
      relativePath: path.relative(root, filePath),
      bytes: fileStat.size,
      sha256: await sha256File(filePath)
    });
  } catch {
    failures.push(`Missing readable artifact: ${filePath}`);
  }
}

const infoPlistPath = path.join(appPath, "Contents", "Info.plist");
const infoPlist = await readInfoPlist(infoPlistPath);
if (!infoPlist) {
  failures.push(`Missing readable bundle Info.plist: ${infoPlistPath}`);
} else {
  const expectedCategory = builderConfig.mac?.category;
  if (infoPlist.CFBundleIdentifier !== builderConfig.appId) {
    failures.push(`Bundle id mismatch: ${infoPlist.CFBundleIdentifier} !== ${builderConfig.appId}`);
  }
  if (infoPlist.CFBundleShortVersionString !== packageJson.version) {
    failures.push(`Bundle version mismatch: ${infoPlist.CFBundleShortVersionString} !== ${packageJson.version}`);
  }
  if (expectedCategory && infoPlist.LSApplicationCategoryType !== expectedCategory) {
    failures.push(`Bundle category mismatch: ${infoPlist.LSApplicationCategoryType} !== ${expectedCategory}`);
  }
}

const codesign = await runCommand("codesign", ["--verify", "--deep", "--strict", "--verbose=2", appPath]);
if (!codesign.ok) {
  failures.push(`Packaged app codesign verification failed: ${codesign.stderr || codesign.stdout}`);
}

const manifest = {
  checkedAt: new Date().toISOString(),
  package: {
    name: packageJson.name,
    version: packageJson.version,
    productName,
    appId: builderConfig.appId,
    arch
  },
  bundle: infoPlist
    ? {
        id: infoPlist.CFBundleIdentifier,
        name: infoPlist.CFBundleName,
        displayName: infoPlist.CFBundleDisplayName,
        executable: infoPlist.CFBundleExecutable,
        version: infoPlist.CFBundleShortVersionString,
        buildVersion: infoPlist.CFBundleVersion,
        category: infoPlist.LSApplicationCategoryType,
        iconFile: infoPlist.CFBundleIconFile
      }
    : null,
  codesign,
  artifacts,
  ok: failures.length === 0,
  failures
};

await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

if (failures.length > 0) {
  console.error(`Release artifact manifest failed. Report: ${manifestPath}`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Release artifact manifest written: ${manifestPath}`);

async function sha256File(filePath) {
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

async function readInfoPlist(filePath) {
  try {
    const { stdout } = await execFileAsync("plutil", ["-convert", "json", "-o", "-", filePath], {
      maxBuffer: 1024 * 1024
    });
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

async function runCommand(command, args) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { maxBuffer: 1024 * 1024 });
    return {
      command: [command, ...args].join(" "),
      ok: true,
      stdout: stdout.trim(),
      stderr: stderr.trim()
    };
  } catch (error) {
    return {
      command: [command, ...args].join(" "),
      ok: false,
      stdout: error.stdout?.trim?.() ?? "",
      stderr: error.stderr?.trim?.() ?? error.message
    };
  }
}
