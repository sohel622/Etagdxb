import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

// Signed Distance Functions for SDF anti-aliased vector rendering
function sdBox(px, py, bx, by) {
  const dx = Math.abs(px) - bx;
  const dy = Math.abs(py) - by;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0);
}

function sdRoundedBox(px, py, bx, by, r) {
  return sdBox(px, py, bx - r, by - r) - r;
}

function sdCircle(px, py, r) {
  return Math.hypot(px, py) - r;
}

/**
 * Returns signed distance to the Flashgram logo glyph (negative inside, positive outside)
 * Coordinates normalized: center is (0, 0), bounding box roughly [-1, 1]
 */
function sdFlashgramGlyph(x, y) {
  // 1. Outer rounded box outline
  // Dimensions match Image 1 & Image 2 (Instagram squircle)
  const boxHalfSize = 0.58;
  const cornerRadius = 0.22;
  const strokeHalfWidth = 0.058;

  const dBox = sdRoundedBox(x, y, boxHalfSize, boxHalfSize, cornerRadius);
  const dOutline = Math.abs(dBox) - strokeHalfWidth;

  // 2. The bite mark at top-right corner
  // In Image 1 & 2: A round circular bite taken out of the top right shoulder
  const biteX = 0.49;
  const biteY = -0.49;
  const biteRadius = 0.145;
  const dBite = sdCircle(x - biteX, y - biteY, biteRadius);

  // Subtract bite from the rounded square outline
  const dOutlineBitten = Math.max(dOutline, -dBite);

  // 3. Center camera lens ring
  const centerRadius = 0.27;
  const centerStrokeHalfWidth = 0.058;
  const dCenterRing = Math.abs(sdCircle(x, y, centerRadius)) - centerStrokeHalfWidth;

  // Union of outline and center ring
  return Math.min(dOutlineBitten, dCenterRing);
}

/**
 * Render image to buffer using SDF
 */
function renderImage({ width, height, isRound = false, isMaskedIcon = false, isMonochrome = false, isForegroundOnly = false }) {
  const png = new PNG({ width, height });
  const pixelSize = 2.0 / Math.min(width, height);

  // Pink color: #E1306C (Instagram pink: R 225, G 48, B 108)
  const bgR = 225, bgG = 48, bgB = 108;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;

      // Normalized coordinates: center at (0, 0), range [-1, 1] on min dimension
      const nx = (x + 0.5 - width / 2) / (Math.min(width, height) / 2);
      const ny = (y + 0.5 - height / 2) / (Math.min(width, height) / 2);

      if (isMonochrome || isForegroundOnly) {
        // Pure glyph with transparent background
        // Scale glyph slightly for status bar icon or adaptive foreground
        const scale = isForegroundOnly ? 0.72 : 0.82;
        const gx = nx / scale;
        const gy = ny / scale;

        const d = sdFlashgramGlyph(gx, gy) * scale;
        const alpha = Math.max(0, Math.min(1, 0.5 - d / pixelSize));

        png.data[idx] = 255;     // Red
        png.data[idx + 1] = 255; // Green
        png.data[idx + 2] = 255; // Blue
        png.data[idx + 3] = Math.round(alpha * 255);
      } else {
        // Full launcher icon (Image 2: Pink background + white glyph)
        let bgAlpha = 1.0;
        if (isRound) {
          // Circle mask for ic_launcher_round
          const dCircle = sdCircle(nx, ny, 0.94);
          bgAlpha = Math.max(0, Math.min(1, 0.5 - dCircle / pixelSize));
        } else if (isMaskedIcon) {
          // Rounded rect mask for standard ic_launcher
          const dSquircle = sdRoundedBox(nx, ny, 0.88, 0.88, 0.28);
          bgAlpha = Math.max(0, Math.min(1, 0.5 - dSquircle / pixelSize));
        }

        const scale = 0.78;
        const gx = nx / scale;
        const gy = ny / scale;

        const dGlyph = sdFlashgramGlyph(gx, gy) * scale;
        const glyphAlpha = Math.max(0, Math.min(1, 0.5 - dGlyph / pixelSize));

        if (bgAlpha <= 0.001) {
          png.data[idx] = 0;
          png.data[idx + 1] = 0;
          png.data[idx + 2] = 0;
          png.data[idx + 3] = 0;
        } else {
          // Blend white glyph over pink background
          const r = Math.round(bgR * (1 - glyphAlpha) + 255 * glyphAlpha);
          const g = Math.round(bgG * (1 - glyphAlpha) + 255 * glyphAlpha);
          const b = Math.round(bgB * (1 - glyphAlpha) + 255 * glyphAlpha);
          const a = Math.round(bgAlpha * 255);

          png.data[idx] = r;
          png.data[idx + 1] = g;
          png.data[idx + 2] = b;
          png.data[idx + 3] = a;
        }
      }
    }
  }

  return PNG.sync.write(png);
}

// Ensure directories exist
function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writePng(filePath, buffer) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, buffer);
  console.log(`Generated: ${filePath}`);
}

async function generateAll() {
  console.log('Generating Flashgram custom icons...');

  // 1. Status Bar Push Notification Icon:
  // android/app/src/main/res/drawable/ic_stat_flashgram.png
  const statBarIcon = renderImage({ width: 96, height: 96, isMonochrome: true });
  writePng('android/app/src/main/res/drawable/ic_stat_flashgram.png', statBarIcon);

  // Also write density-specific drawables for crisp rendering
  const statSizes = [
    { dir: 'drawable-mdpi', size: 24 },
    { dir: 'drawable-hdpi', size: 36 },
    { dir: 'drawable-xhdpi', size: 48 },
    { dir: 'drawable-xxhdpi', size: 72 },
    { dir: 'drawable-xxxhdpi', size: 96 }
  ];
  for (const item of statSizes) {
    const buf = renderImage({ width: item.size, height: item.size, isMonochrome: true });
    writePng(`android/app/src/main/res/${item.dir}/ic_stat_flashgram.png`, buf);
  }

  // 2. Launcher icons (standard, round, foreground) across mipmap densities
  const mipmapDensities = [
    { dir: 'mipmap-mdpi', size: 48, fgSize: 108 },
    { dir: 'mipmap-hdpi', size: 72, fgSize: 162 },
    { dir: 'mipmap-xhdpi', size: 96, fgSize: 216 },
    { dir: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
    { dir: 'mipmap-xxxhdpi', size: 192, fgSize: 432 }
  ];

  for (const d of mipmapDensities) {
    // ic_launcher.png (standard squircle launcher icon)
    const bufLauncher = renderImage({ width: d.size, height: d.size, isMaskedIcon: true });
    writePng(`android/app/src/main/res/${d.dir}/ic_launcher.png`, bufLauncher);

    // ic_launcher_round.png (round launcher icon)
    const bufRound = renderImage({ width: d.size, height: d.size, isRound: true });
    writePng(`android/app/src/main/res/${d.dir}/ic_launcher_round.png`, bufRound);

    // ic_launcher_foreground.png (adaptive foreground icon)
    const bufFg = renderImage({ width: d.fgSize, height: d.fgSize, isForegroundOnly: true });
    writePng(`android/app/src/main/res/${d.dir}/ic_launcher_foreground.png`, bufFg);
  }

  // 3. Update public web favicons and icons
  writePng('public/favicon.png', statBarIcon);
  writePng('public/app-icon.png', renderImage({ width: 192, height: 192, isMaskedIcon: true }));

  console.log('Successfully generated all Flashgram icons!');
}

generateAll().catch(console.error);
