// Regenerates public/icons/* from the LevitateMark brand glyph. Run with:
//   node scripts/generate-pwa-icons.mjs
// Re-run this if the LevitateMark SVG (src/components/brand/LevitateLogo.tsx) ever changes.
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = path.join(ROOT, 'public', 'icons');
mkdirSync(OUT_DIR, { recursive: true });

const DEFS = `
  <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#f7e8c4"/>
    <stop offset="0.48" stop-color="#d3a24c"/>
    <stop offset="1" stop-color="#8c5917"/>
  </linearGradient>
  <linearGradient id="slabGradient" x1="14" y1="12" x2="41" y2="41" gradientUnits="userSpaceOnUse">
    <stop stop-color="#3b2300" stop-opacity="0.98" />
    <stop offset="1" stop-color="#6a4410" stop-opacity="0.9" />
  </linearGradient>
  <linearGradient id="slabGradientSecondary" x1="17" y1="16" x2="38" y2="35" gradientUnits="userSpaceOnUse">
    <stop stop-color="#fff3d6" stop-opacity="0.88" />
    <stop offset="1" stop-color="#f0c671" stop-opacity="0.48" />
  </linearGradient>
  <linearGradient id="shadowGradient" x1="16" y1="42" x2="40" y2="42" gradientUnits="userSpaceOnUse">
    <stop stop-color="#fff3d6" stop-opacity="0.2" />
    <stop offset="0.5" stop-color="#fff3d6" stop-opacity="0.72" />
    <stop offset="1" stop-color="#fff3d6" stop-opacity="0.2" />
  </linearGradient>
`;

const MARK = `
  <path d="M28 8.75 41.25 15.45 28 22.1 14.75 15.45Z" fill="url(#slabGradientSecondary)" />
  <path d="M28 11.1 38.2 16.25 28 21.35 17.8 16.25Z" fill="url(#slabGradient)" opacity="0.92" />
  <path d="M28 22.55 38.1 27.65 28 32.75 17.9 27.65Z" fill="url(#slabGradient)" opacity="0.9" />
  <path d="M28 33.65 36.2 37.8 28 41.9 19.8 37.8Z" fill="url(#slabGradient)" opacity="0.88" />
  <path d="M17.9 16.25V27.65M38.1 16.25V27.65M19.8 37.8l-1.9-10.15M36.2 37.8l1.9-10.15" stroke="url(#slabGradientSecondary)" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.65" opacity="0.92" />
  <path d="M15.4 45.2c3.85-2.05 8.05-3.05 12.6-3.05s8.75 1 12.6 3.05" fill="none" stroke="url(#shadowGradient)" stroke-linecap="round" stroke-width="1.8" />
  <circle cx="28" cy="27.65" r="1.85" fill="#f7e8c4" opacity="0.96" />
`;

// Plain icon: rounded-square background, content fills the 56x56 box (safe for "any" purpose).
function plainSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><defs>${DEFS}</defs><rect width="56" height="56" rx="15" fill="url(#bgGrad)" />${MARK}</svg>`;
}

// Maskable icon: the OS applies its own crop shape, so the background must be
// full-bleed (no rounded corners baked in) and the mark inset ~20% so it
// survives a circular mask.
function maskableSvg() {
  const size = 80;
  const inset = 12; // (80-56)/2, centers the 56x56 mark with a safe margin
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><defs>${DEFS}</defs><rect width="${size}" height="${size}" fill="url(#bgGrad)" /><g transform="translate(${inset} ${inset})">${MARK}</g></svg>`;
}

async function render(svg, size, outPath) {
  await sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png().toFile(outPath);
  console.log('wrote', outPath);
}

await render(plainSvg(), 192, path.join(OUT_DIR, 'icon-192.png'));
await render(plainSvg(), 512, path.join(OUT_DIR, 'icon-512.png'));
await render(plainSvg(), 180, path.join(OUT_DIR, 'apple-touch-icon.png'));
await render(maskableSvg(), 512, path.join(OUT_DIR, 'icon-maskable-512.png'));

writeFileSync(path.join(OUT_DIR, 'icon.svg'), plainSvg());
console.log('done');
