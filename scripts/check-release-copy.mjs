import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const artifactDir = path.join(rootDir, "qa-artifacts");
const reportPath = path.join(artifactDir, "release-copy-check.json");
const scanRoots = ["src", "electron"];
const scanExtensions = new Set([".ts", ".tsx", ".css", ".cjs", ".html"]);
const ignoredSuffixes = [".test.ts", ".test.tsx", ".d.ts"];
const bannedCopy = [
  { label: "coming soon", pattern: /\bcoming\s+soon\b/i },
  { label: "planned", pattern: /\bplanned\b/i },
  { label: "todo", pattern: /\bto\s*do\b|\btodo\b/i },
  { label: "fixme", pattern: /\bfixme\b/i },
  { label: "wip", pattern: /\bwip\b/i },
  { label: "placeholder", pattern: /\bplaceholder\b/i },
  { label: "lorem ipsum", pattern: /\blorem\b|\bipsum\b/i },
  { label: "tbd", pattern: /\btbd\b/i },
  { label: "not implemented", pattern: /\bnot\s+implemented\b/i },
  { label: "under construction", pattern: /\bunder\s+construction\b/i },
  { label: "korean planned", pattern: /준비\s*중|예정|미구현|임시/ }
];

const files = [];
for (const scanRoot of scanRoots) {
  await collectFiles(path.join(rootDir, scanRoot), files);
}
files.push(path.join(rootDir, "index.html"));

const findings = [];
for (const absoluteFile of files) {
  const relativeFile = path.relative(rootDir, absoluteFile);
  if (!shouldScan(relativeFile)) {
    continue;
  }
  const source = await readFile(absoluteFile, "utf8");
  source.split(/\r?\n/).forEach((line, index) => {
    for (const banned of bannedCopy) {
      if (banned.pattern.test(line)) {
        findings.push({
          file: relativeFile,
          line: index + 1,
          label: banned.label,
          text: line.trim().slice(0, 220)
        });
      }
    }
  });
}

const report = {
  ok: findings.length === 0,
  checkedAt: new Date().toISOString(),
  scanRoots,
  checkedFiles: files.map((file) => path.relative(rootDir, file)).filter(shouldScan).sort(),
  bannedLabels: bannedCopy.map((item) => item.label),
  findings
};

await mkdir(artifactDir, { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (!report.ok) {
  console.error(`Release copy check failed. Report: ${reportPath}`);
  console.error(JSON.stringify(findings, null, 2));
  process.exit(1);
}

console.log(`Release copy check passed: ${report.checkedFiles.length} runtime files.`);
console.log(`Report: ${reportPath}`);

async function collectFiles(dir, out) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(absolutePath, out);
    } else if (entry.isFile()) {
      out.push(absolutePath);
    }
  }
}

function shouldScan(relativeFile) {
  if (ignoredSuffixes.some((suffix) => relativeFile.endsWith(suffix))) {
    return false;
  }
  return scanExtensions.has(path.extname(relativeFile));
}
