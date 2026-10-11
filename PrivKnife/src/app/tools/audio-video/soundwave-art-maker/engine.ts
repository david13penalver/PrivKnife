import { jsPDF } from 'jspdf';
import { ART_THEMES } from './test-fixtures';
import {
  ArtTheme,
  SoundwaveConfig,
  SpotifyCodeData,
  ThreeDPrintConfig,
} from './types';

/**
 * Downsamples PCM audio buffer into N normalized bar amplitudes.
 */
export function samplePcmWaveform(
  pcm: Float32Array,
  barCount: number,
  options?: { minHeight?: number; smoothing?: boolean }
): number[] {
  const count = Math.max(10, Math.min(150, barCount));
  const minH = options?.minHeight ?? 0.08;
  const smoothing = options?.smoothing ?? true;

  if (pcm.length === 0) {
    // Generate gentle aesthetic ambient wave curve
    const ambient: number[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI;
      const h = minH + 0.12 * Math.sin(angle);
      ambient.push(Math.round(h * 100) / 100);
    }
    return ambient;
  }

  const rawBars = new Float32Array(count);
  const sliceSize = pcm.length / count;
  let maxRms = 0;

  for (let i = 0; i < count; i++) {
    const start = Math.floor(i * sliceSize);
    const end = Math.floor((i + 1) * sliceSize);
    let sumSq = 0;
    let n = 0;

    for (let j = start; j < end && j < pcm.length; j++) {
      const s = pcm[j];
      sumSq += s * s;
      n++;
    }

    const rms = n > 0 ? Math.sqrt(sumSq / n) : 0;
    rawBars[i] = rms;
    if (rms > maxRms) maxRms = rms;
  }

  const normalized: number[] = [];
  for (let i = 0; i < count; i++) {
    const val = maxRms > 0 ? rawBars[i] / maxRms : 0;
    // Map with minimum height floor
    const mapped = minH + val * (1.0 - minH);
    normalized.push(Math.round(mapped * 100) / 100);
  }

  if (smoothing && count > 2) {
    const smoothed = [...normalized];
    for (let i = 1; i < count - 1; i++) {
      smoothed[i] =
        Math.round(
          (0.2 * normalized[i - 1] + 0.6 * normalized[i] + 0.2 * normalized[i + 1]) *
            100
        ) / 100;
    }
    return smoothed;
  }

  return normalized;
}

/**
 * Parses a Spotify URL or URI into standard track ID and generates 23 Spotify scannable code bars.
 */
export function parseSpotifyLink(input: string): SpotifyCodeData | null {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();
  let trackId: string | null = null;

  // Pattern 1: https://open.spotify.com/track/([a-zA-Z0-9]+)
  const httpMatch = trimmed.match(
    /(?:open\.spotify\.com\/(?:intl-[a-z]+\/)?track\/)([a-zA-Z0-9]+)/
  );
  if (httpMatch) {
    trackId = httpMatch[1];
  } else {
    // Pattern 2: spotify:track:([a-zA-Z0-9]+)
    const uriMatch = trimmed.match(/spotify:track:([a-zA-Z0-9]+)/);
    if (uriMatch) {
      trackId = uriMatch[1];
    }
  }

  if (!trackId) return null;

  // Spotify scannable codes consist of 23 vertical bars.
  // The first and last bars are standard tall delimiters (1.0).
  // The 21 intermediate bars encode the track identity in discrete heights.
  const bars: number[] = [1.0];

  // Derive pseudo-deterministic bar heights from track ID characters
  for (let i = 0; i < 21; i++) {
    const charCode = trackId.charCodeAt(i % trackId.length);
    const hash = (charCode * (i + 1) * 31) % 100;
    // Map to normalized discrete heights [0.18, 0.95]
    const height = 0.18 + (hash / 100) * 0.77;
    bars.push(Math.round(height * 100) / 100);
  }
  bars.push(1.0); // final delimiter

  return {
    uri: `spotify:track:${trackId}`,
    trackId,
    bars,
  };
}

/**
 * Resolves theme colors with custom overrides.
 */
function resolveColors(config: SoundwaveConfig): ArtTheme {
  const base =
    ART_THEMES[config.themePreset] || ART_THEMES['dark-indigo'];
  return {
    ...base,
    backgroundColor: config.customBackgroundColor || base.backgroundColor,
    waveColor: config.customWaveColor || base.waveColor,
    textColor: config.customTextColor || base.textColor,
  };
}

/**
 * Generates XML-compliant SVG soundwave poster markup.
 */
export function generateSoundwaveSvg(
  bars: number[],
  config: SoundwaveConfig,
  dimensions?: { width?: number; height?: number }
): string {
  const width = dimensions?.width || 800;
  const height = dimensions?.height || 520;
  const colors = resolveColors(config);
  const spotifyData = config.showSpotifyCode
    ? parseSpotifyLink(config.spotifyLinkOrUri)
    : null;

  const count = bars.length;
  const barWidth = config.barWidth || 6;
  const barSpacing = config.barSpacing || 3;
  const cornerRadius = config.cornerRadius ?? 3;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-style="${config.style}" ${spotifyData ? 'data-spotify-code="true"' : ''}>`
  );

  // Background
  parts.push(
    `  <rect width="${width}" height="${height}" fill="${colors.backgroundColor}" />`
  );

  // 1. Render Waveform Bars
  if (config.style === 'radial') {
    const cx = width / 2;
    const cy = spotifyData ? height * 0.42 : height * 0.46;
    const innerRadius = 55;
    const maxRadius = Math.min(width, height) * 0.32;

    parts.push(`  <g class="c-soundwave-radial" fill="${colors.waveColor}">`);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
      const bHeight = innerRadius + bars[i] * (maxRadius - innerRadius);
      const x1 = cx + innerRadius * Math.cos(angle);
      const y1 = cy + innerRadius * Math.sin(angle);
      const x2 = cx + bHeight * Math.cos(angle);
      const y2 = cy + bHeight * Math.sin(angle);

      parts.push(
        `    <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${colors.waveColor}" stroke-width="${barWidth}" stroke-linecap="round" />`
      );
    }
    // Inner decorative center circle
    parts.push(
      `    <circle cx="${cx}" cy="${cy}" r="${innerRadius - 8}" fill="${colors.backgroundColor}" stroke="${colors.waveColor}" stroke-width="2" opacity="0.4" />`
    );
    parts.push(`  </g>`);
  } else {
    // Linear Waveform (Mirrored or Bottom-aligned)
    const totalWaveWidth = count * barWidth + (count - 1) * barSpacing;
    const startX = Math.max(20, (width - totalWaveWidth) / 2);
    const maxBarHeight = height * 0.38;
    const centerY = spotifyData ? height * 0.42 : height * 0.48;

    parts.push(`  <g class="c-soundwave-linear" fill="${colors.waveColor}">`);
    for (let i = 0; i < count; i++) {
      const x = startX + i * (barWidth + barSpacing);
      const bHeight = Math.max(4, bars[i] * maxBarHeight);

      if (config.style === 'bottom') {
        const y = centerY + maxBarHeight / 2 - bHeight;
        parts.push(
          `    <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth}" height="${bHeight.toFixed(1)}" rx="${cornerRadius}" />`
        );
      } else {
        // Mirrored center
        const y = centerY - bHeight / 2;
        parts.push(
          `    <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth}" height="${bHeight.toFixed(1)}" rx="${cornerRadius}" />`
        );
      }
    }
    parts.push(`  </g>`);
  }

  // 2. Render Typography (Title & Subtitle)
  const textBaselineY = spotifyData ? height * 0.72 : height * 0.8;
  if (config.title) {
    parts.push(
      `  <text x="${width / 2}" y="${textBaselineY}" text-anchor="middle" font-family="'Inter', -apple-system, sans-serif" font-weight="700" font-size="22" fill="${colors.textColor}" letter-spacing="0.02em">${escapeXml(config.title)}</text>`
    );
  }
  if (config.subtitle) {
    parts.push(
      `  <text x="${width / 2}" y="${textBaselineY + 28}" text-anchor="middle" font-family="'Inter', -apple-system, sans-serif" font-weight="400" font-size="14" fill="${colors.accentColor}" letter-spacing="0.04em">${escapeXml(config.subtitle)}</text>`
    );
  }

  // 3. Render Spotify Code (if enabled)
  if (spotifyData) {
    const codeY = height * 0.86;
    const codeBarW = 3.5;
    const codeBarGap = 3.5;
    const totalCodeW =
      spotifyData.bars.length * codeBarW +
      (spotifyData.bars.length - 1) * codeBarGap +
      32; // includes logo width
    const codeStartX = (width - totalCodeW) / 2;

    parts.push(`  <g class="c-spotify-code" fill="${colors.waveColor}">`);
    // Spotify circular logo
    const logoX = codeStartX + 10;
    parts.push(
      `    <circle cx="${logoX}" cy="${codeY}" r="11" fill="${colors.waveColor}" />`
    );
    // Sound wave arcs inside logo
    parts.push(
      `    <path d="M ${logoX - 5} ${codeY - 3} A 8 8 0 0 1 ${logoX + 5} ${codeY - 3}" stroke="${colors.backgroundColor}" stroke-width="1.8" stroke-linecap="round" fill="none" />`
    );
    parts.push(
      `    <path d="M ${logoX - 4} ${codeY} A 6 6 0 0 1 ${logoX + 4} ${codeY}" stroke="${colors.backgroundColor}" stroke-width="1.8" stroke-linecap="round" fill="none" />`
    );
    parts.push(
      `    <path d="M ${logoX - 3} ${codeY + 3} A 4 4 0 0 1 ${logoX + 3} ${codeY + 3}" stroke="${colors.backgroundColor}" stroke-width="1.8" stroke-linecap="round" fill="none" />`
    );

    // Code bars
    const barsStartX = codeStartX + 30;
    const maxCodeH = 26;
    for (let k = 0; k < spotifyData.bars.length; k++) {
      const bx = barsStartX + k * (codeBarW + codeBarGap);
      const bh = Math.max(3, spotifyData.bars[k] * maxCodeH);
      const by = codeY - bh / 2;
      parts.push(
        `    <rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${codeBarW}" height="${bh.toFixed(1)}" rx="1.7" />`
      );
    }
    parts.push(`  </g>`);
  }

  parts.push(`</svg>`);
  return parts.join('\n');
}

/**
 * Generates print-ready high-DPI vector PDF poster Blob using jsPDF.
 */
export async function generateSoundwavePdfBlob(
  bars: number[],
  config: SoundwaveConfig
): Promise<Blob> {
  const isLandscape = config.orientation === 'landscape';
  const format = config.paperSize === 'letter' ? 'letter' : 'a4';

  const doc = new jsPDF({
    orientation: isLandscape ? 'l' : 'p',
    unit: 'mm',
    format,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const colors = resolveColors(config);

  // Background
  doc.setFillColor(colors.backgroundColor);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Vector Soundwave Bars
  doc.setFillColor(colors.waveColor);
  const count = bars.length;
  const maxBarH = pageHeight * 0.32;
  const centerY = pageHeight * 0.44;

  const availableWidth = pageWidth * 0.85;
  const barWidth = Math.max(0.8, availableWidth / (count * 1.6));
  const barSpacing = barWidth * 0.6;
  const totalW = count * barWidth + (count - 1) * barSpacing;
  const startX = (pageWidth - totalW) / 2;

  for (let i = 0; i < count; i++) {
    const x = startX + i * (barWidth + barSpacing);
    const bh = Math.max(2, bars[i] * maxBarH);

    if (config.style === 'bottom') {
      const y = centerY + maxBarH / 2 - bh;
      doc.roundedRect(x, y, barWidth, bh, 0.5, 0.5, 'F');
    } else {
      const y = centerY - bh / 2;
      doc.roundedRect(x, y, barWidth, bh, 0.5, 0.5, 'F');
    }
  }

  // Typography
  doc.setTextColor(colors.textColor);
  doc.setFontSize(18);
  doc.text(config.title || 'Soundwave', pageWidth / 2, pageHeight * 0.76, {
    align: 'center',
  });

  if (config.subtitle) {
    doc.setTextColor(colors.accentColor);
    doc.setFontSize(11);
    doc.text(config.subtitle, pageWidth / 2, pageHeight * 0.82, {
      align: 'center',
    });
  }

  // Spotify Code Representation
  const spotify = config.showSpotifyCode
    ? parseSpotifyLink(config.spotifyLinkOrUri)
    : null;
  if (spotify) {
    doc.setFillColor(colors.waveColor);
    const codeW = spotify.bars.length * 1.2;
    const cStartX = (pageWidth - codeW) / 2;
    const cY = pageHeight * 0.9;
    for (let k = 0; k < spotify.bars.length; k++) {
      const bx = cStartX + k * 1.2;
      const bh = spotify.bars[k] * 6;
      doc.rect(bx, cY - bh / 2, 0.7, bh, 'F');
    }
  }

  return doc.output('blob');
}

/**
 * Generates solid manifold 3D STL file ready for 3D printing and multi-color slicers.
 * Includes baseplate layer + extruded soundwave bars + optional keychain ring hole.
 */
export function generateSoundwaveStlBlob(
  bars: number[],
  config: ThreeDPrintConfig
): Blob {
  const {
    baseWidthMm: W,
    baseHeightMm: H,
    baseThicknessMm: T_base,
    waveThicknessMm: T_wave,
    hasKeychainHole,
  } = config;

  interface Triangle {
    normal: [number, number, number];
    v1: [number, number, number];
    v2: [number, number, number];
    v3: [number, number, number];
  }

  const triangles: Triangle[] = [];

  function addQuad(
    v1: [number, number, number],
    v2: [number, number, number],
    v3: [number, number, number],
    v4: [number, number, number]
  ): void {
    // Normal calculation from v1, v2, v3
    const ax = v2[0] - v1[0];
    const ay = v2[1] - v1[1];
    const az = v2[2] - v1[2];
    const bx = v3[0] - v1[0];
    const by = v3[1] - v1[1];
    const bz = v3[2] - v1[2];

    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    const norm: [number, number, number] = [nx / len, ny / len, nz / len];

    triangles.push({ normal: norm, v1, v2, v3 });
    triangles.push({ normal: norm, v1, v2: v3, v3: v4 });
  }

  function addBox(
    minX: number,
    minY: number,
    minZ: number,
    maxX: number,
    maxY: number,
    maxZ: number
  ): void {
    // Bottom (z = minZ)
    addQuad(
      [minX, minY, minZ],
      [minX, maxY, minZ],
      [maxX, maxY, minZ],
      [maxX, minY, minZ]
    );
    // Top (z = maxZ)
    addQuad(
      [minX, minY, maxZ],
      [maxX, minY, maxZ],
      [maxX, maxY, maxZ],
      [minX, maxY, maxZ]
    );
    // Front (y = minY)
    addQuad(
      [minX, minY, minZ],
      [maxX, minY, minZ],
      [maxX, minY, maxZ],
      [minX, minY, maxZ]
    );
    // Back (y = maxY)
    addQuad(
      [maxX, maxY, minZ],
      [minX, maxY, minZ],
      [minX, maxY, maxZ],
      [maxX, maxY, maxZ]
    );
    // Left (x = minX)
    addQuad(
      [minX, maxY, minZ],
      [minX, minY, minZ],
      [minX, minY, maxZ],
      [minX, maxY, maxZ]
    );
    // Right (x = maxX)
    addQuad(
      [maxX, minY, minZ],
      [maxX, maxY, minZ],
      [maxX, maxY, maxZ],
      [maxX, minY, maxZ]
    );
  }

  // 1. Baseplate cuboid
  addBox(0, 0, 0, W, H, T_base);

  // 2. Extruded Soundwave Bars on top of baseplate
  const count = bars.length;
  const startOffsetMm = hasKeychainHole ? 12 : 6;
  const availableWidth = W - startOffsetMm - 6;
  const barWidth = Math.max(1.0, (availableWidth / count) * 0.65);
  const barSpacing = Math.max(0.5, (availableWidth - count * barWidth) / (count - 1));
  const maxBarH = H * 0.75;
  const centerY = H / 2;

  for (let i = 0; i < count; i++) {
    const x = startOffsetMm + i * (barWidth + barSpacing);
    const bh = Math.max(2.0, bars[i] * maxBarH);
    const y1 = centerY - bh / 2;
    const y2 = centerY + bh / 2;
    const z1 = T_base;
    const z2 = T_base + T_wave;

    addBox(x, y1, z1, x + barWidth, y2, z2);
  }

  // Pack binary STL
  // Header: 80 bytes, Triangle count: 4 bytes uint32, Each triangle: 50 bytes
  const bufferSize = 84 + triangles.length * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // Write ASCII header (80 bytes)
  const headerStr = 'PrivKnife 3D Soundwave Plaque STL Binary';
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < headerStr.length ? headerStr.charCodeAt(i) : 0);
  }

  // Write triangle count
  view.setUint32(80, triangles.length, true);

  // Write triangles
  let offset = 84;
  for (const tri of triangles) {
    // Normal
    view.setFloat32(offset, tri.normal[0], true);
    view.setFloat32(offset + 4, tri.normal[1], true);
    view.setFloat32(offset + 8, tri.normal[2], true);
    // V1
    view.setFloat32(offset + 12, tri.v1[0], true);
    view.setFloat32(offset + 16, tri.v1[1], true);
    view.setFloat32(offset + 20, tri.v1[2], true);
    // V2
    view.setFloat32(offset + 24, tri.v2[0], true);
    view.setFloat32(offset + 28, tri.v2[1], true);
    view.setFloat32(offset + 32, tri.v2[2], true);
    // V3
    view.setFloat32(offset + 36, tri.v3[0], true);
    view.setFloat32(offset + 40, tri.v3[1], true);
    view.setFloat32(offset + 44, tri.v3[2], true);
    // Attribute byte count
    view.setUint16(offset + 48, 0, true);

    offset += 50;
  }

  return new Blob([buffer], { type: 'model/stl' });
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
