/**
 * One-shot: convert `public/logo.jpeg` to `public/logo.png` with the
 * (assumed-black) background replaced by transparency.
 *
 * Strategy:
 *   - Load the JPEG, ensure an alpha channel exists.
 *   - For each pixel, look at its brightest channel (max of R/G/B). If that
 *     value is below LOWER_THRESHOLD → fully transparent. Between LOWER and
 *     UPPER → linearly interpolated alpha for a soft anti-aliased edge.
 *     Above UPPER → fully opaque (keeps the red/yellow tag intact).
 *
 * Run:  npx tsx scripts/transparent-logo.ts
 */
import { promises as fs } from 'node:fs';
import sharp from 'sharp';

const SRC = 'public/logo.jpeg';
const OUT = 'public/logo.png';

// Pixels darker than this (per-channel max) become fully transparent.
const LOWER_THRESHOLD = 20;
// Pixels brighter than this stay fully opaque. Between LOWER and UPPER the
// alpha is interpolated for a smooth edge — kills JPEG compression fringing.
const UPPER_THRESHOLD = 55;

async function main() {
  try {
    await fs.access(SRC);
  } catch {
    console.error(`✗ Missing source: ${SRC}`);
    process.exit(1);
  }

  const { data, info } = await sharp(SRC)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 4) {
    console.error(`Unexpected channel count: ${info.channels}`);
    process.exit(1);
  }

  const pixels = Buffer.from(data); // mutable copy

  let madeTransparent = 0;
  let softened = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const max = Math.max(r, g, b);

    if (max <= LOWER_THRESHOLD) {
      pixels[i + 3] = 0;
      madeTransparent++;
    } else if (max < UPPER_THRESHOLD) {
      const t = (max - LOWER_THRESHOLD) / (UPPER_THRESHOLD - LOWER_THRESHOLD);
      pixels[i + 3] = Math.round(t * 255);
      softened++;
    }
  }

  await sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9, palette: false })
    .toFile(OUT);

  const stat = await fs.stat(OUT);
  const total = info.width * info.height;
  console.log(`✓ ${OUT}`);
  console.log(`  ${info.width}×${info.height}, ${(stat.size / 1024).toFixed(0)} KB`);
  console.log(
    `  ${madeTransparent.toLocaleString()} pixels fully transparent (${((madeTransparent / total) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  ${softened.toLocaleString()} pixels softened on the edge (${((softened / total) * 100).toFixed(1)}%)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
