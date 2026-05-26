/**
 * Generates the square favicon and Apple touch icon from `public/logo.png`.
 *
 * Next.js App Router file convention picks these up automatically:
 *   - `src/app/icon.png`        → <link rel="icon">  (browser tab, bookmarks)
 *   - `src/app/apple-icon.png`  → <link rel="apple-touch-icon"> (iOS home screen)
 *
 * The source logo is wide (rectangular tag), so we fit-inside a square box
 * and pad the remainder with transparency. The whole tag stays visible at
 * every favicon resolution, just sitting in the middle of the icon square.
 *
 * Run:  npm run favicon
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'public/logo.png';

const TARGETS = [
  { out: 'src/app/icon.png', size: 512 }, // master square — Next downsizes for tabs
  { out: 'src/app/apple-icon.png', size: 180 }, // Apple guideline exact size
];

async function squareIcon(size: number, outPath: string) {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await sharp(SRC)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  const stat = await fs.stat(outPath);
  console.log(`  ${outPath}: ${size}×${size}, ${(stat.size / 1024).toFixed(0)} KB`);
}

async function main() {
  try {
    await fs.access(SRC);
  } catch {
    console.error(`✗ Missing source: ${SRC}`);
    console.error(`  Run \`npm run logo:transparent\` first to generate it from logo.jpeg.`);
    process.exit(1);
  }

  console.log(`Building favicons from ${SRC}:`);
  for (const t of TARGETS) {
    await squareIcon(t.size, t.out);
  }
  console.log('✓ favicons regenerated');
  console.log('');
  console.log('Next.js will pick these up automatically on the next dev/build cycle.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
