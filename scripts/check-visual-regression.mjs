import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactDir = path.join(rootDir, "qa-artifacts");
const baselinePath = path.join(rootDir, "qa-baselines", "visual-regression.json");
const reportPath = path.join(artifactDir, "visual-regression.json");
const update = process.argv.includes("--update");

const gridWidth = 16;
const gridHeight = 9;
const defaultThresholds = {
  maxMeanCellDelta: 18,
  maxWorstCellDelta: 82,
  minHashSimilarity: 0.78,
  maxAverageLumaDelta: 18,
  maxContrastDelta: 24
};

const screenshots = [
  "packaged-smoke-fresh.png",
  "packaged-smoke-boss-visual.png",
  "packaged-smoke-map-chronicle.png",
  "packaged-smoke-save-import.png",
  "packaged-smoke-invalid-save-import.png",
  "packaged-smoke-restore-backup.png",
  "packaged-smoke-boss-story.png",
  "packaged-smoke-campaign-clear.png",
  "dmg-smoke-title.png",
  "dmg-smoke-battle.png",
  "zip-smoke-title.png",
  "zip-smoke-battle.png"
];

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function readPng(buffer, file) {
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(pngSignature)) {
    throw new Error(`${file} is not a PNG file`);
  }

  let offset = 8;
  let header;
  const idatChunks = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const data = buffer.subarray(dataStart, dataEnd);

    if (type === "IHDR") {
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12]
      };
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset = dataEnd + 4;
  }

  if (!header) {
    throw new Error(`${file} is missing IHDR`);
  }
  if (header.bitDepth !== 8 || header.compression !== 0 || header.filter !== 0 || header.interlace !== 0) {
    throw new Error(`${file} uses unsupported PNG encoding`);
  }

  const channels = getChannelCount(header.colorType, file);
  const stride = header.width * channels;
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const rows = new Uint8Array(header.height * stride);
  let sourceOffset = 0;
  let rowOffset = 0;
  let previous = new Uint8Array(stride);

  for (let y = 0; y < header.height; y += 1) {
    const filterType = inflated[sourceOffset];
    sourceOffset += 1;
    const raw = inflated.subarray(sourceOffset, sourceOffset + stride);
    sourceOffset += stride;
    const row = new Uint8Array(stride);

    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? row[x - channels] : 0;
      const up = previous[x] ?? 0;
      const upLeft = x >= channels ? previous[x - channels] : 0;
      row[x] = (raw[x] + filterDelta(filterType, left, up, upLeft)) & 0xff;
    }

    rows.set(row, rowOffset);
    rowOffset += stride;
    previous = row;
  }

  return { ...header, channels, stride, pixels: rows };
}

function getChannelCount(colorType, file) {
  if (colorType === 6) {
    return 4;
  }
  if (colorType === 2) {
    return 3;
  }
  if (colorType === 0) {
    return 1;
  }
  throw new Error(`${file} uses unsupported PNG color type ${colorType}`);
}

function filterDelta(type, left, up, upLeft) {
  if (type === 0) {
    return 0;
  }
  if (type === 1) {
    return left;
  }
  if (type === 2) {
    return up;
  }
  if (type === 3) {
    return Math.floor((left + up) / 2);
  }
  if (type === 4) {
    return paeth(left, up, upLeft);
  }
  throw new Error(`Unsupported PNG filter ${type}`);
}

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
    return left;
  }
  return upDistance <= upLeftDistance ? up : upLeft;
}

function pixelLuma(image, x, y) {
  const index = y * image.stride + x * image.channels;
  if (image.channels === 1) {
    return image.pixels[index];
  }
  const alpha = image.channels === 4 ? image.pixels[index + 3] / 255 : 1;
  const luma = image.pixels[index] * 0.2126 + image.pixels[index + 1] * 0.7152 + image.pixels[index + 2] * 0.0722;
  return luma * alpha + 255 * (1 - alpha);
}

function createSignature(file, bytes, image) {
  const grid = [];
  let total = 0;
  let totalSquared = 0;
  let pixelCount = 0;

  for (let gy = 0; gy < gridHeight; gy += 1) {
    const yStart = Math.floor((gy * image.height) / gridHeight);
    const yEnd = Math.floor(((gy + 1) * image.height) / gridHeight);
    for (let gx = 0; gx < gridWidth; gx += 1) {
      const xStart = Math.floor((gx * image.width) / gridWidth);
      const xEnd = Math.floor(((gx + 1) * image.width) / gridWidth);
      let cellTotal = 0;
      let cellCount = 0;

      for (let y = yStart; y < yEnd; y += 1) {
        for (let x = xStart; x < xEnd; x += 1) {
          const luma = pixelLuma(image, x, y);
          cellTotal += luma;
          total += luma;
          totalSquared += luma * luma;
          cellCount += 1;
          pixelCount += 1;
        }
      }
      grid.push(Math.round(cellTotal / Math.max(1, cellCount)));
    }
  }

  const averageLuma = total / Math.max(1, pixelCount);
  const variance = totalSquared / Math.max(1, pixelCount) - averageLuma * averageLuma;

  return {
    file,
    bytes,
    width: image.width,
    height: image.height,
    bitDepth: image.bitDepth,
    colorType: image.colorType,
    averageLuma: round(averageLuma),
    contrast: round(Math.sqrt(Math.max(0, variance))),
    averageHash: createAverageHash(grid),
    grid
  };
}

function createAverageHash(grid) {
  const hashCells = [];
  for (let gy = 0; gy < 8; gy += 1) {
    for (let gx = 0; gx < 8; gx += 1) {
      const sourceX = Math.floor((gx * gridWidth) / 8);
      const sourceY = Math.floor((gy * gridHeight) / 8);
      hashCells.push(grid[sourceY * gridWidth + sourceX]);
    }
  }
  const average = hashCells.reduce((sum, value) => sum + value, 0) / hashCells.length;
  let bits = 0n;
  hashCells.forEach((value, index) => {
    if (value >= average) {
      bits |= 1n << BigInt(index);
    }
  });
  return bits.toString(16).padStart(16, "0");
}

function compareSignature(current, baseline) {
  const failures = [];
  if (current.width !== baseline.width || current.height !== baseline.height) {
    failures.push(`dimension changed from ${baseline.width}x${baseline.height} to ${current.width}x${current.height}`);
  }

  const deltas = current.grid.map((value, index) => Math.abs(value - baseline.grid[index]));
  const meanCellDelta = deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
  const worstCellDelta = Math.max(...deltas);
  const hashSimilarity = getHashSimilarity(current.averageHash, baseline.averageHash);
  const averageLumaDelta = Math.abs(current.averageLuma - baseline.averageLuma);
  const contrastDelta = Math.abs(current.contrast - baseline.contrast);

  if (meanCellDelta > defaultThresholds.maxMeanCellDelta) {
    failures.push(`mean cell delta ${round(meanCellDelta)} > ${defaultThresholds.maxMeanCellDelta}`);
  }
  if (worstCellDelta > defaultThresholds.maxWorstCellDelta) {
    failures.push(`worst cell delta ${round(worstCellDelta)} > ${defaultThresholds.maxWorstCellDelta}`);
  }
  if (hashSimilarity < defaultThresholds.minHashSimilarity) {
    failures.push(`hash similarity ${round(hashSimilarity)} < ${defaultThresholds.minHashSimilarity}`);
  }
  if (averageLumaDelta > defaultThresholds.maxAverageLumaDelta) {
    failures.push(`average luma delta ${round(averageLumaDelta)} > ${defaultThresholds.maxAverageLumaDelta}`);
  }
  if (contrastDelta > defaultThresholds.maxContrastDelta) {
    failures.push(`contrast delta ${round(contrastDelta)} > ${defaultThresholds.maxContrastDelta}`);
  }

  return {
    ok: failures.length === 0,
    meanCellDelta: round(meanCellDelta),
    worstCellDelta: round(worstCellDelta),
    hashSimilarity: round(hashSimilarity),
    averageLumaDelta: round(averageLumaDelta),
    contrastDelta: round(contrastDelta),
    failures
  };
}

function getHashSimilarity(currentHash, baselineHash) {
  const current = BigInt(`0x${currentHash}`);
  const baseline = BigInt(`0x${baselineHash}`);
  let diff = current ^ baseline;
  let distance = 0;
  while (diff > 0n) {
    distance += Number(diff & 1n);
    diff >>= 1n;
  }
  return (64 - distance) / 64;
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

async function collectSignatures() {
  const results = [];
  for (const file of screenshots) {
    const absoluteFile = path.join(artifactDir, file);
    const buffer = await fs.readFile(absoluteFile);
    const image = readPng(buffer, file);
    results.push(createSignature(file, buffer.length, image));
  }
  return results;
}

const signatures = await collectSignatures();

if (update) {
  await fs.mkdir(path.dirname(baselinePath), { recursive: true });
  await fs.writeFile(
    baselinePath,
    `${JSON.stringify(
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        grid: { width: gridWidth, height: gridHeight },
        thresholds: defaultThresholds,
        screenshots: signatures
      },
      null,
      2
    )}\n`
  );
  console.log(`Visual regression baseline updated: ${baselinePath}`);
}

let baseline;
try {
  baseline = JSON.parse(await fs.readFile(baselinePath, "utf8"));
} catch (error) {
  throw new Error(`Visual regression baseline missing or unreadable: ${error.message}`);
}

const baselineByFile = new Map(baseline.screenshots.map((signature) => [signature.file, signature]));
const comparisons = signatures.map((signature) => {
  const expected = baselineByFile.get(signature.file);
  if (!expected) {
    return { file: signature.file, ok: false, failures: ["missing baseline"] };
  }
  return { file: signature.file, ...compareSignature(signature, expected), current: signature };
});

const failures = comparisons.filter((result) => !result.ok);
await fs.writeFile(
  reportPath,
  `${JSON.stringify(
    {
      ok: failures.length === 0,
      checkedAt: new Date().toISOString(),
      baselinePath,
      thresholds: defaultThresholds,
      comparisons,
      failures: failures.map(({ file, failures: fileFailures }) => ({ file, failures: fileFailures }))
    },
    null,
    2
  )}\n`
);

if (failures.length > 0) {
  console.error(`Visual regression check failed. Report: ${reportPath}`);
  console.error(JSON.stringify(failures.map(({ file, failures: fileFailures }) => ({ file, failures: fileFailures })), null, 2));
  process.exit(1);
}

console.log(`Visual regression check passed: ${comparisons.length} screenshots.`);
console.log(`Report: ${reportPath}`);
