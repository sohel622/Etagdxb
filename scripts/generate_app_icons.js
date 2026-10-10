import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const SIZES = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192
};

const VARIANTS = ['retro', 'sketch', 'neon', 'dark', 'gold'];

// Color palettes for variants
function getColorAt(variant, x, y, size) {
  const nx = x / size;
  const ny = y / size;
  const cx = size / 2;
  const cy = size / 2;
  const distCenter = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / (size / 2);

  // Border radius squircle check
  // Distance from center with squircle metric |x|^4 + |y|^4 <= r^4
  const sqX = Math.abs((x - cx) / (size * 0.44));
  const sqY = Math.abs((y - cy) / (size * 0.44));
  const sqDist = Math.pow(Math.pow(sqX, 4) + Math.pow(sqY, 4), 0.25);
  const isInsideIcon = sqDist <= 1.0;

  if (!isInsideIcon) {
    return [0, 0, 0, 0]; // Transparent outside squircle
  }

  // Camera Glyph Geometry
  const gx = Math.abs(x - cx) / (size * 0.24);
  const gy = Math.abs(y - cy) / (size * 0.24);
  const glyphSq = Math.pow(Math.pow(gx, 3.5) + Math.pow(gy, 3.5), 0.285);
  const isGlyphBorder = Math.abs(glyphSq - 1.0) < 0.12;
  const isLensBorder = Math.abs(distCenter - 0.26) < 0.08;
  const isFlashDot = Math.hypot(x - (cx + size * 0.18), y - (cy - size * 0.18)) < size * 0.04;
  const isCameraGlyph = isGlyphBorder || isLensBorder || isFlashDot;

  if (variant === 'retro') {
    // Vintage camera: Top cream/tan with rainbow, bottom brown leather
    if (ny < 0.38) {
      // Top section cream
      if (nx > 0.65 && nx < 0.85) {
        // Rainbow stripes (blue, green, yellow, red)
        const rx = (nx - 0.65) / 0.20;
        if (rx < 0.25) return [56, 151, 240, 255]; // blue
        if (rx < 0.50) return [112, 192, 90, 255]; // green
        if (rx < 0.75) return [253, 203, 56, 255]; // yellow
        return [237, 73, 86, 255]; // red
      }
      return [245, 235, 220, 255]; // cream tan
    } else {
      // Leatherette bottom
      const r = 140 + Math.floor(Math.sin(nx * 30 + ny * 30) * 10);
      const g = 80 + Math.floor(Math.sin(nx * 30 + ny * 30) * 6);
      const b = 40;
      if (isCameraGlyph) return [255, 245, 230, 255];
      return [r, g, b, 255];
    }
  }

  if (variant === 'sketch') {
    // Minimal ivory with graphite sketch
    const bg = 248;
    if (isCameraGlyph) return [30, 30, 30, 255];
    return [bg, bg, bg, 255];
  }

  if (variant === 'neon') {
    // Cyberpunk neon: deep black with cyan & magenta glow
    if (isCameraGlyph) {
      if (nx < 0.5) return [0, 242, 254, 255]; // cyan
      return [255, 0, 127, 255]; // neon magenta
    }
    // Deep obsidian dark
    const r = Math.floor(10 + ny * 20);
    const g = Math.floor(10 + nx * 15);
    const b = Math.floor(25 + ny * 30);
    return [r, g, b, 255];
  }

  if (variant === 'dark') {
    // Pitch black OLED with crisp white glyph
    if (isCameraGlyph) return [255, 255, 255, 255];
    return [15, 15, 15, 255];
  }

  if (variant === 'gold') {
    // Metallic gold
    const goldFactor = (nx + ny) / 2;
    const r = Math.floor(190 + Math.sin(goldFactor * Math.PI) * 55);
    const g = Math.floor(150 + Math.sin(goldFactor * Math.PI) * 45);
    const b = Math.floor(50 + Math.sin(goldFactor * Math.PI) * 40);
    if (isCameraGlyph) return [255, 255, 255, 255];
    return [r, g, b, 255];
  }

  return [225, 48, 108, 255];
}

function generateVariantPng(variant, size, round = false) {
  const png = new PNG({ width: size, height: size });
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      if (round) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > maxRadius) {
          png.data[idx] = 0;
          png.data[idx + 1] = 0;
          png.data[idx + 2] = 0;
          png.data[idx + 3] = 0;
          continue;
        }
      }
      const [r, g, b, a] = getColorAt(variant, x, y, size);
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }
  }
  return png;
}

const baseResDir = path.resolve('android/app/src/main/res');

// 1. Generate PNGs in mipmap folders
for (const [density, size] of Object.entries(SIZES)) {
  const dir = path.join(baseResDir, `mipmap-${density}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  for (const variant of VARIANTS) {
    const png = generateVariantPng(variant, size, false);
    fs.writeFileSync(path.join(dir, `ic_launcher_${variant}.png`), PNG.sync.write(png));

    const roundPng = generateVariantPng(variant, size, true);
    fs.writeFileSync(path.join(dir, `ic_launcher_${variant}_round.png`), PNG.sync.write(roundPng));
  }
}

// 2. Generate XML Adaptive Icons for API 26+ in mipmap-anydpi-v26
const anyDpiDir = path.join(baseResDir, 'mipmap-anydpi-v26');
if (!fs.existsSync(anyDpiDir)) fs.mkdirSync(anyDpiDir, { recursive: true });

for (const variant of VARIANTS) {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_${variant}"/>
    <foreground android:drawable="@mipmap/ic_launcher_${variant}"/>
</adaptive-icon>
`;
  fs.writeFileSync(path.join(anyDpiDir, `ic_launcher_${variant}.xml`), xml);
}

console.log('Successfully generated Android Launcher Icon assets for all 5 variants!');
