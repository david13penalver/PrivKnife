import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { GLYPH_3X3, GLYPH_5X5 } from './fonts';
import {
  AsciiBannerOptions,
  Barcode1dOptions,
  Barcode1dRenderResult,
  CommentWrapper,
  ImageAsciiOptions,
  PixelGridInput,
  QrContrastCheck,
  QrErrorCorrection,
  QrRenderResult,
  QrStudioOptions,
} from './types';

function renderGlyph5x5ForFont(
  glyph: readonly string[],
  font: AsciiBannerOptions['font'],
): string[] {
  if (font === 'standard') {
    return [...glyph];
  }
  if (font === 'block') {
    return glyph.map((row) =>
      row
        .split('')
        .map((c) => (c === '#' ? '██' : '  '))
        .join(''),
    );
  }
  if (font === 'slant') {
    return glyph.map((row, rIdx) => {
      const pad = ' '.repeat(4 - rIdx);
      return `${pad}${row.replace(/#/g, '/')}`;
    });
  }
  if (font === 'shadow' || font === 'banner3d') {
    const fillChar = font === 'banner3d' ? '▓' : '#';
    const shadeChar = font === 'banner3d' ? '▒' : '░';
    const rows = glyph.length;
    const cols = glyph[0]?.length ?? 0;
    const grid = Array.from({ length: rows + 1 }, () =>
      Array<string>(cols + 1).fill(' '),
    );
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (glyph[r][c] === '#') {
          grid[r][c] = fillChar;
          if (grid[r + 1][c + 1] === ' ') {
            grid[r + 1][c + 1] = shadeChar;
          }
          if (font === 'banner3d' && grid[r][c + 1] === ' ') {
            grid[r][c + 1] = shadeChar;
          }
        }
      }
    }
    return grid.map((line) => line.join(''));
  }
  return [...glyph];
}

export function wrapAsciiComment(
  bannerText: string,
  wrapper: CommentWrapper,
): string {
  if (!bannerText) return '';
  if (wrapper === 'none') return bannerText;

  const lines = bannerText.split('\n');
  switch (wrapper) {
    case 'hash':
      return lines.map((line) => `# ${line}`).join('\n');
    case 'js_line':
      return lines.map((line) => `// ${line}`).join('\n');
    case 'sql':
      return lines.map((line) => `-- ${line}`).join('\n');
    case 'js_block':
      return `/*\n${lines.map((line) => ` * ${line}`).join('\n')}\n */`;
    case 'html':
      return `<!--\n${lines.join('\n')}\n-->`;
  }
}

export function renderAsciiBanner(options: AsciiBannerOptions): string {
  const raw = options.text ?? '';
  if (raw.trim().length === 0) return '';

  const spacing = ' '.repeat(Math.min(3, Math.max(0, Math.round(options.letterSpacing || 0))));
  const inputLines = raw.toUpperCase().split(/\r?\n/);

  const blocks = inputLines.map((lineText) => {
    if (lineText.length === 0) return '';
    const rowCount =
      options.font === 'small'
        ? 3
        : options.font === 'shadow' || options.font === 'banner3d'
          ? 6
          : 5;
    const rows = Array.from({ length: rowCount }, () => [] as string[]);

    for (const ch of lineText) {
      let glyphRows: string[];
      if (options.font === 'small') {
        const g = GLYPH_3X3[ch] ?? GLYPH_5X5[ch]?.slice(0, 3) ?? GLYPH_3X3[' '];
        glyphRows = [...g];
      } else {
        const g = GLYPH_5X5[ch] ?? GLYPH_5X5['?'];
        glyphRows = renderGlyph5x5ForFont(g, options.font);
      }

      for (let r = 0; r < rowCount; r++) {
        rows[r].push(glyphRows[r] ?? '');
      }
    }

    return rows.map((parts) => parts.join(spacing)).join('\n');
  });

  const joined = blocks.join('\n\n');
  return wrapAsciiComment(joined, options.commentWrapper);
}

function clampByte(n: number): number {
  return n < 0 ? 0 : n > 255 ? 255 : n;
}

function sampleLuminance(
  grid: PixelGridInput,
  sx: number,
  sy: number,
  contrast: number,
  invert: boolean,
): number {
  const x = Math.min(grid.width - 1, Math.max(0, sx));
  const y = Math.min(grid.height - 1, Math.max(0, sy));
  const idx = (y * grid.width + x) * 4;
  const r = grid.data[idx] ?? 255;
  const g = grid.data[idx + 1] ?? 255;
  const b = grid.data[idx + 2] ?? 255;
  const a = (grid.data[idx + 3] ?? 255) / 255;

  // Composite translucent foreground over solid white paper background
  const rawLum = 0.299 * r + 0.587 * g + 0.114 * b;
  const composited = a * rawLum + (1 - a) * 255;
  let adjusted = clampByte((composited - 128) * contrast + 128);
  if (invert) {
    adjusted = 255 - adjusted;
  }
  return adjusted;
}

const BRAILLE_DOT_BITS: readonly (readonly [number, number])[] = [
  [0x01, 0x08], // row 0: dot1, dot4
  [0x02, 0x10], // row 1: dot2, dot5
  [0x04, 0x20], // row 2: dot3, dot6
  [0x40, 0x80], // row 3: dot7, dot8
];

const ASCII_RAMPS: Record<'ramp_dense' | 'ramp_simple' | 'blocks', string> = {
  ramp_dense: '@%#*+=-:. ',
  ramp_simple: '#@%*+=-:. ',
  blocks: '█▓▒░ ',
};

export function convertImageDataToAscii(
  grid: PixelGridInput,
  options: ImageAsciiOptions,
): string {
  if (!grid || grid.width <= 0 || grid.height <= 0 || grid.data.length < 4) {
    return '';
  }

  const cols = Math.min(160, Math.max(1, Math.round(options.columns || 80)));
  const contrast = Math.min(2.5, Math.max(0.25, options.contrast || 1));

  if (options.mode === 'braille') {
    const brailleRows = Math.max(1, Math.round((cols * grid.height) / (grid.width * 2)));
    const subW = cols * 2;
    const subH = brailleRows * 4;
    const lum = new Float32Array(subW * subH);

    for (let y = 0; y < subH; y++) {
      const sy = Math.floor((y * grid.height) / subH);
      for (let x = 0; x < subW; x++) {
        const sx = Math.floor((x * grid.width) / subW);
        lum[y * subW + x] = sampleLuminance(
          grid,
          sx,
          sy,
          contrast,
          options.invertLuminance,
        );
      }
    }

    if (options.ditherBraille) {
      for (let y = 0; y < subH; y++) {
        for (let x = 0; x < subW; x++) {
          const i = y * subW + x;
          const oldVal = lum[i];
          const newVal = oldVal < 128 ? 0 : 255;
          lum[i] = newVal;
          const err = oldVal - newVal;
          if (x + 1 < subW) lum[i + 1] += (err * 7) / 16;
          if (y + 1 < subH) {
            if (x > 0) lum[i + subW - 1] += (err * 3) / 16;
            lum[i + subW] += (err * 5) / 16;
            if (x + 1 < subW) lum[i + subW + 1] += err / 16;
          }
        }
      }
    }

    const outLines: string[] = [];
    for (let cy = 0; cy < brailleRows; cy++) {
      let line = '';
      for (let cx = 0; cx < cols; cx++) {
        let mask = 0;
        for (let dy = 0; dy < 4; dy++) {
          const py = cy * 4 + dy;
          for (let dx = 0; dx < 2; dx++) {
            const px = cx * 2 + dx;
            if (lum[py * subW + px] < 128) {
              mask |= BRAILLE_DOT_BITS[dy][dx];
            }
          }
        }
        line += String.fromCodePoint(0x2800 | mask);
      }
      outLines.push(line);
    }
    return outLines.join('\n');
  }

  const ramp = ASCII_RAMPS[options.mode];
  const rows = Math.max(1, Math.round(cols * (grid.height / grid.width) * 0.5));
  const outLines: string[] = [];

  for (let y = 0; y < rows; y++) {
    const sy = Math.floor((y * grid.height) / rows);
    let line = '';
    for (let x = 0; x < cols; x++) {
      const sx = Math.floor((x * grid.width) / cols);
      const val = sampleLuminance(
        grid,
        sx,
        sy,
        contrast,
        options.invertLuminance,
      );
      const charIdx = Math.min(
        ramp.length - 1,
        Math.floor((val / 256) * ramp.length),
      );
      line += ramp[charIdx];
    }
    outLines.push(line);
  }
  return outLines.join('\n');
}

// ---------- Seam 1B: Static 2D QR Studio, WCAG Scan Contrast & 1D Barcodes ----------

export function escapeXml(raw: string): string {
  if (!raw) return '';
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function escapeWifiField(raw: string): string {
  return String(raw ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/:/g, '\\:')
    .replace(/"/g, '\\"');
}

function sanitizeVcardField(raw: string): string {
  return String(raw ?? '')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

export function buildQrPayload(options: QrStudioOptions): string {
  switch (options.payloadType) {
    case 'text_url':
      return (options.rawText ?? '').trim();
    case 'wifi': {
      const ssid = escapeWifiField(options.wifi?.ssid ?? '');
      if (!ssid) return '';
      const enc = options.wifi?.encryption ?? 'WPA';
      const pwd =
        enc === 'nopass' ? '' : escapeWifiField(options.wifi?.password ?? '');
      const hidden = options.wifi?.hidden ? 'true' : 'false';
      return `WIFI:T:${enc};S:${ssid};P:${pwd};H:${hidden};;`;
    }
    case 'vcard': {
      const name = sanitizeVcardField(options.vcard?.fullName ?? '');
      if (!name) return '';
      const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${name}`, `N:${name};;;`];
      const org = sanitizeVcardField(options.vcard?.organization ?? '');
      const phone = sanitizeVcardField(options.vcard?.phone ?? '');
      const email = sanitizeVcardField(options.vcard?.email ?? '');
      const url = sanitizeVcardField(options.vcard?.website ?? '');
      if (org) lines.push(`ORG:${org}`);
      if (phone) lines.push(`TEL;TYPE=CELL:${phone}`);
      if (email) lines.push(`EMAIL:${email}`);
      if (url) lines.push(`URL:${url}`);
      lines.push('END:VCARD');
      return lines.join('\n');
    }
    case 'email': {
      const to = (options.email?.to ?? '').trim();
      if (!to) return '';
      const params: string[] = [];
      if (options.email?.subject) {
        params.push(`subject=${encodeURIComponent(options.email.subject)}`);
      }
      if (options.email?.body) {
        params.push(`body=${encodeURIComponent(options.email.body)}`);
      }
      return params.length > 0 ? `mailto:${to}?${params.join('&')}` : `mailto:${to}`;
    }
    case 'sms': {
      const phone = (options.sms?.phone ?? '').trim();
      if (!phone) return '';
      const msg = options.sms?.message ?? '';
      return `smsto:${phone}:${msg}`;
    }
    case 'geo': {
      const lat = (options.geo?.latitude ?? '').trim();
      const lng = (options.geo?.longitude ?? '').trim();
      if (!lat || !lng) return '';
      return `geo:${lat},${lng}`;
    }
  }
}

function parseHexRgb(hex: string): [number, number, number] | null {
  const clean = (hex ?? '').trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return null;
}

function relativeLuminance(rgb: [number, number, number]): number {
  const channels = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function sanitizeHexColor(raw: string, fallback: string): string {
  const clean = (raw ?? '').trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(clean) ? clean : fallback;
}

export function computeQrContrast(
  foregroundHex: string,
  backgroundHex: string,
): QrContrastCheck {
  const fg = parseHexRgb(foregroundHex);
  const bg = parseHexRgb(backgroundHex);
  if (!fg || !bg) {
    return { ratio: 1, isScannable: false, warningKey: 'invalid_color' };
  }

  const fgLum = relativeLuminance(fg);
  const bgLum = relativeLuminance(bg);
  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  const ratio = Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;

  if (ratio < 3) {
    return { ratio, isScannable: false, warningKey: 'low_contrast' };
  }
  if (fgLum > bgLum) {
    return { ratio, isScannable: false, warningKey: 'inverted_polarity' };
  }
  return { ratio, isScannable: true };
}

function isSafeRasterOrSvgDataUrl(url?: string): boolean {
  if (!url) return false;
  return /^data:image\/(?:png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(
    url.trim(),
  );
}

function isFinderModule(r: number, c: number, size: number): boolean {
  const inTopLeft = r < 7 && c < 7;
  const inTopRight = r < 7 && c >= size - 7;
  const inBottomLeft = r >= size - 7 && c < 7;
  return inTopLeft || inTopRight || inBottomLeft;
}

export function renderQrSvg(options: QrStudioOptions): QrRenderResult {
  const payload = buildQrPayload(options);
  const fg = sanitizeHexColor(options.foregroundHex, '#0f172a');
  const bg = sanitizeHexColor(options.backgroundHex, '#ffffff');
  const contrast = computeQrContrast(fg, bg);

  if (!payload) {
    return {
      success: false,
      payload: '',
      svg: '',
      moduleCount: 0,
      effectiveErrorCorrection: options.errorCorrection,
      contrast,
      error: 'QR payload is empty.',
    };
  }

  const hasSafeLogo = isSafeRasterOrSvgDataUrl(options.logoDataUrl);
  const effectiveEc: QrErrorCorrection = hasSafeLogo ? 'H' : options.errorCorrection;

  try {
    const qr = QRCode.create(payload, { errorCorrectionLevel: effectiveEc });
    const size = qr.modules.size;
    const data = qr.modules.data;
    const quiet = Math.min(8, Math.max(1, Math.round(options.quietZoneModules || 3)));
    const totalModules = size + quiet * 2;
    const exportPx = Math.min(2048, Math.max(256, Math.round(options.exportSizePx || 1024)));

    const shapes: string[] = [
      `<rect x="0" y="0" width="${totalModules}" height="${totalModules}" fill="${fg === bg ? '#ffffff' : escapeXml(bg)}" />`,
    ];
    // Re-set background explicitly to bg
    shapes[0] = `<rect x="0" y="0" width="${totalModules}" height="${totalModules}" fill="${escapeXml(bg)}" />`;

    const style = options.moduleStyle;
    const fgEsc = escapeXml(fg);

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!data[r * size + c]) continue;
        const x = c + quiet;
        const y = r + quiet;
        const finder = isFinderModule(r, c, size);

        if (style === 'dots' && !finder) {
          shapes.push(
            `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.42" fill="${fgEsc}" />`,
          );
        } else if (style === 'rounded' || (style === 'dots' && finder)) {
          shapes.push(
            `<rect x="${x + 0.04}" y="${y + 0.04}" width="0.92" height="0.92" rx="0.24" ry="0.24" fill="${fgEsc}" />`,
          );
        } else {
          shapes.push(
            `<rect x="${x}" y="${y}" width="1" height="1" fill="${fgEsc}" />`,
          );
        }
      }
    }

    if (hasSafeLogo && options.logoDataUrl) {
      const clampedScale = Math.min(22, Math.max(10, Number(options.logoScalePercent) || 18));
      const logoSpan = (size * clampedScale) / 100;
      const center = totalModules / 2;
      const pad = 0.6;
      const boxSpan = logoSpan + pad * 2;
      shapes.push(
        `<rect x="${(center - boxSpan / 2).toFixed(2)}" y="${(center - boxSpan / 2).toFixed(2)}" width="${boxSpan.toFixed(2)}" height="${boxSpan.toFixed(2)}" rx="0.8" fill="${escapeXml(bg)}" />`,
      );
      shapes.push(
        `<image href="${escapeXml(options.logoDataUrl.trim())}" x="${(center - logoSpan / 2).toFixed(2)}" y="${(center - logoSpan / 2).toFixed(2)}" width="${logoSpan.toFixed(2)}" height="${logoSpan.toFixed(2)}" preserveAspectRatio="xMidYMid meet" />`,
      );
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${totalModules}" width="${exportPx}" height="${exportPx}" shape-rendering="geometricPrecision">${shapes.join('')}</svg>`;

    return {
      success: true,
      payload,
      svg,
      moduleCount: size,
      effectiveErrorCorrection: effectiveEc,
      contrast,
    };
  } catch (err) {
    return {
      success: false,
      payload,
      svg: '',
      moduleCount: 0,
      effectiveErrorCorrection: effectiveEc,
      contrast,
      error: err instanceof Error ? err.message : 'Unable to encode QR payload.',
    };
  }
}

export function renderBarcode1dSvg(options: Barcode1dOptions): Barcode1dRenderResult {
  const val = (options.value ?? '').trim();
  if (!val) {
    return { success: false, svg: '', error: 'Barcode value cannot be empty.' };
  }

  const lineColor = sanitizeHexColor(options.lineColor, '#0f172a');
  const bg = sanitizeHexColor(options.background, '#ffffff');
  const barWidth = Math.min(4, Math.max(1, Math.round(options.barWidth || 2)));
  const barHeight = Math.min(160, Math.max(40, Math.round(options.height || 80)));

  try {
    const carrier: { encodings?: { data?: string; text?: string }[] } = {};
    JsBarcode(carrier as never, val, {
      format: options.format,
      displayValue: options.displayValue,
      margin: 0,
    });

    const enc = carrier.encodings?.[0];
    const bits = enc?.data ?? '';
    if (!bits) {
      return {
        success: false,
        svg: '',
        error: `Invalid input "${val}" for format ${options.format}.`,
      };
    }

    const quietX = 12;
    const padTop = 10;
    const textHeight = options.displayValue ? 24 : 10;
    const totalW = bits.length * barWidth + quietX * 2;
    const totalH = padTop + barHeight + textHeight;

    const rects: string[] = [
      `<rect x="0" y="0" width="${totalW}" height="${totalH}" fill="${escapeXml(bg)}" />`,
    ];

    // Coalesce adjacent '1' modules into crisp contiguous SVG rectangles
    let runStart = -1;
    for (let i = 0; i <= bits.length; i++) {
      const bit = i < bits.length ? bits[i] : '0';
      if (bit === '1' && runStart === -1) {
        runStart = i;
      } else if (bit !== '1' && runStart !== -1) {
        const w = (i - runStart) * barWidth;
        const x = quietX + runStart * barWidth;
        rects.push(
          `<rect x="${x}" y="${padTop}" width="${w}" height="${barHeight}" fill="${escapeXml(lineColor)}" />`,
        );
        runStart = -1;
      }
    }

    if (options.displayValue) {
      const displayStr = enc?.text ?? val;
      rects.push(
        `<text x="${totalW / 2}" y="${padTop + barHeight + 17}" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14" fill="${escapeXml(lineColor)}">${escapeXml(displayStr)}</text>`,
      );
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}">${rects.join('')}</svg>`;
    return { success: true, svg };
  } catch (err) {
    return {
      success: false,
      svg: '',
      error:
        err instanceof Error
          ? err.message
          : `Failed to generate ${options.format} barcode.`,
    };
  }
}

export function svgToDataUri(svg: string): string {
  if (!svg) return '';
  const bytes = new TextEncoder().encode(svg);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}
