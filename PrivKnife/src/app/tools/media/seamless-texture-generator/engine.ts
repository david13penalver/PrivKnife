import JSZip from 'jszip';
import pako from 'pako';
import {
  SeamlessTextureGeneratorOptions,
  SeamlessTextureGeneratorResult,
  TextureBlendMode,
  TextureImageData,
} from './types';

// Precomputed CRC-32 table
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c;
}

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type: string, data: Uint8Array): Uint8Array {
  const len = data.length;
  const chunk = new Uint8Array(12 + len);
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, len);
  for (let i = 0; i < 4; i++) {
    chunk[4 + i] = type.charCodeAt(i);
  }
  chunk.set(data, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  dv.setUint32(8 + len, crc);
  return chunk;
}

/**
 * Pure TypeScript PNG encoder without DOM canvas
 */
export function pixelDataToPngBytes(img: TextureImageData): Uint8Array {
  const { width, height, data } = img;
  // Scanlines: 1 filter byte (0 = none) + width * 4 bytes per row
  const rawScanlines = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rawOffset = y * (1 + width * 4);
    rawScanlines[rawOffset] = 0; // Filter: None
    const dataOffset = y * width * 4;
    rawScanlines.set(data.subarray(dataOffset, dataOffset + width * 4), rawOffset + 1);
  }

  const deflated = pako.deflate(rawScanlines);

  // IHDR (13 bytes)
  const ihdr = new Uint8Array(13);
  const dvIhdr = new DataView(ihdr.buffer);
  dvIhdr.setUint32(0, width);
  dvIhdr.setUint32(4, height);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression: 0
  ihdr[11] = 0; // Filter: 0
  ihdr[12] = 0; // Interlace: 0

  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = makePngChunk('IHDR', ihdr);
  const idatChunk = makePngChunk('IDAT', deflated);
  const iendChunk = makePngChunk('IEND', new Uint8Array(0));

  const totalLength = signature.length + ihdrChunk.length + idatChunk.length + iendChunk.length;
  const pngBytes = new Uint8Array(totalLength);
  let offset = 0;

  pngBytes.set(signature, offset);
  offset += signature.length;

  pngBytes.set(ihdrChunk, offset);
  offset += ihdrChunk.length;

  pngBytes.set(idatChunk, offset);
  offset += idatChunk.length;

  pngBytes.set(iendChunk, offset);

  return pngBytes;
}

export function textureToPngBlob(img: TextureImageData): Blob {
  const bytes = pixelDataToPngBytes(img);
  return new Blob([bytes as BlobPart], { type: 'image/png' });
}

function bytesToBase64DataUrl(bytes: Uint8Array, mimeType: string): string {
  if (typeof btoa === 'function') {
    let binary = '';
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      const slice = bytes.subarray(i, Math.min(i + chunk, bytes.length));
      binary += String.fromCharCode.apply(null, Array.from(slice));
    }
    return `data:${mimeType};base64,${btoa(binary)}`;
  }
  if (typeof Buffer !== 'undefined') {
    return `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`;
  }
  return '';
}

/**
 * Resamples image pixel data to target width and height using bilinear interpolation
 */
export function resamplePixelData(
  src: TextureImageData,
  targetWidth: number,
  targetHeight: number
): TextureImageData {
  if (src.width === targetWidth && src.height === targetHeight) {
    return src;
  }
  if (targetWidth <= 0 || targetHeight <= 0) {
    return src;
  }

  const outData = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  const xRatio = src.width / targetWidth;
  const yRatio = src.height / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    const srcY = y * yRatio;
    const y0 = Math.floor(srcY);
    const y1 = Math.min(src.height - 1, y0 + 1);
    const yWeight = srcY - y0;

    for (let x = 0; x < targetWidth; x++) {
      const srcX = x * xRatio;
      const x0 = Math.floor(srcX);
      const x1 = Math.min(src.width - 1, x0 + 1);
      const xWeight = srcX - x0;

      const idx00 = (y0 * src.width + x0) * 4;
      const idx10 = (y0 * src.width + x1) * 4;
      const idx01 = (y1 * src.width + x0) * 4;
      const idx11 = (y1 * src.width + x1) * 4;

      const outIdx = (y * targetWidth + x) * 4;
      for (let c = 0; c < 4; c++) {
        const top = src.data[idx00 + c] * (1 - xWeight) + src.data[idx10 + c] * xWeight;
        const bottom = src.data[idx01 + c] * (1 - xWeight) + src.data[idx11 + c] * xWeight;
        outData[outIdx + c] = Math.round(top * (1 - yWeight) + bottom * yWeight);
      }
    }
  }

  return { width: targetWidth, height: targetHeight, data: outData };
}

/**
 * Computes seam crossfade blend weight (1.0 at seam center dist=0, decaying to 0.0 at radius)
 */
export function computeSeamAlpha(
  dist: number,
  radius: number,
  blendMode: TextureBlendMode
): number {
  if (radius <= 0 || dist >= radius) {
    return 0;
  }
  const t = Math.max(0, Math.min(1, 1 - dist / radius));
  if (blendMode === 'poisson_blend') {
    // Hermite cubic smoothstep: 3t^2 - 2t^3
    return t * t * (3 - 2 * t);
  }
  // Cosine crossfade
  return 0.5 * (1 - Math.cos(Math.PI * t));
}

/**
 * Creates seamless texture using offset & edge blending or mirroring.
 * Uses a two-pass separable toroidal crossfade for full vertical and horizontal seam continuity.
 */
export function makeSeamlessTexture(
  src: TextureImageData,
  options: SeamlessTextureGeneratorOptions
): TextureImageData {
  const { width, height } = src;
  const outData = new Uint8ClampedArray(width * height * 4);

  if (options.blendMode === 'mirror_repeat') {
    // Mirror repeat: quad-mirroring so all 4 edges seamlessly meet
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const normX = x < width / 2 ? x * 2 : (width - 1 - x) * 2;
        const normY = y < height / 2 ? y * 2 : (height - 1 - y) * 2;

        const srcX = Math.min(width - 1, Math.floor(normX));
        const srcY = Math.min(height - 1, Math.floor(normY));

        const srcIdx = (srcY * width + srcX) * 4;
        const outIdx = (y * width + x) * 4;

        outData[outIdx] = src.data[srcIdx];
        outData[outIdx + 1] = src.data[srcIdx + 1];
        outData[outIdx + 2] = src.data[srcIdx + 2];
        outData[outIdx + 3] = src.data[srcIdx + 3];
      }
    }

    return { width, height, data: outData };
  }

  const halfW = Math.floor(width / 2);
  const halfH = Math.floor(height / 2);

  const overlapRadiusX = Math.min(
    halfW - 1,
    Math.max(2, Math.floor(width * (options.edgeOverlapPercentage / 100)))
  );
  const overlapRadiusY = Math.min(
    halfH - 1,
    Math.max(2, Math.floor(height * (options.edgeOverlapPercentage / 100)))
  );

  // Pass 1: Horizontal wrap by halfW & vertical seam crossfade at x = halfW across all y
  const pass1 = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const shiftedX = (x + halfW) % width;
      const targetIdx = (y * width + x) * 4;
      const shiftedIdx = (y * width + shiftedX) * 4;
      const distX = Math.abs(x - halfW);

      if (distX < overlapRadiusX) {
        const weight = computeSeamAlpha(distX, overlapRadiusX, options.blendMode);
        const origIdx = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) {
          pass1[targetIdx + c] = Math.round(
            weight * src.data[origIdx + c] + (1 - weight) * src.data[shiftedIdx + c]
          );
        }
        pass1[targetIdx + 3] = 255;
      } else {
        pass1[targetIdx] = src.data[shiftedIdx];
        pass1[targetIdx + 1] = src.data[shiftedIdx + 1];
        pass1[targetIdx + 2] = src.data[shiftedIdx + 2];
        pass1[targetIdx + 3] = src.data[shiftedIdx + 3];
      }
    }
  }

  // Pass 2: Vertical wrap by halfH & horizontal seam crossfade at y = halfH across all x
  for (let y = 0; y < height; y++) {
    const shiftedY = (y + halfH) % height;
    const distY = Math.abs(y - halfH);

    for (let x = 0; x < width; x++) {
      const targetIdx = (y * width + x) * 4;
      const shiftedIdx = (shiftedY * width + x) * 4;

      if (distY < overlapRadiusY) {
        const weight = computeSeamAlpha(distY, overlapRadiusY, options.blendMode);
        const origIdx = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) {
          outData[targetIdx + c] = Math.round(
            weight * pass1[origIdx + c] + (1 - weight) * pass1[shiftedIdx + c]
          );
        }
        outData[targetIdx + 3] = 255;
      } else {
        outData[targetIdx] = pass1[shiftedIdx];
        outData[targetIdx + 1] = pass1[shiftedIdx + 1];
        outData[targetIdx + 2] = pass1[shiftedIdx + 2];
        outData[targetIdx + 3] = pass1[shiftedIdx + 3];
      }
    }
  }

  return { width, height, data: outData };
}

/**
 * Generate Normal Map using Sobel operators
 */
export function generateNormalMap(
  src: TextureImageData,
  strength = 2.5,
  invertY = false
): TextureImageData {
  const { width, height } = src;
  const outData = new Uint8ClampedArray(width * height * 4);

  const getLuminance = (x: number, y: number): number => {
    const wrapX = (x + width) % width;
    const wrapY = (y + height) % height;
    const idx = (wrapY * width + wrapX) * 4;
    return (
      (0.299 * src.data[idx] +
        0.587 * src.data[idx + 1] +
        0.114 * src.data[idx + 2]) /
      255
    );
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // 8 neighbor samples
      const tl = getLuminance(x - 1, y - 1);
      const tm = getLuminance(x, y - 1);
      const tr = getLuminance(x + 1, y - 1);
      const ml = getLuminance(x - 1, y);
      const mr = getLuminance(x + 1, y);
      const bl = getLuminance(x - 1, y + 1);
      const bm = getLuminance(x, y + 1);
      const br = getLuminance(x + 1, y + 1);

      // Sobel horizontal and vertical gradients
      const dx = (tr + 2 * mr + br) - (tl + 2 * ml + bl);
      const dy = (bl + 2 * bm + br) - (tl + 2 * tm + tr);

      // Normal vector
      const nx = -dx * strength;
      const ny = (invertY ? -1 : 1) * dy * strength;
      const nz = 1.0;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

      const idx = (y * width + x) * 4;
      outData[idx] = Math.min(255, Math.max(0, Math.round(((nx / len) * 0.5 + 0.5) * 255)));
      outData[idx + 1] = Math.min(255, Math.max(0, Math.round(((ny / len) * 0.5 + 0.5) * 255)));
      outData[idx + 2] = Math.min(255, Math.max(0, Math.round(((nz / len) * 0.5 + 0.5) * 255)));
      outData[idx + 3] = 255;
    }
  }

  return { width, height, data: outData };
}

/**
 * Generate CSS background snippet
 */
export function generateCssBackgroundSnippet(fileName = 'diffuse_seamless.png'): string {
  return `.tileable-surface {
  background-image: url("${fileName}");
  background-repeat: repeat;
  background-size: auto;
}
`;
}

/**
 * Main texture processing pipeline
 */
export async function processTexture(
  src: TextureImageData,
  options: SeamlessTextureGeneratorOptions
): Promise<SeamlessTextureGeneratorResult> {
  if (!src || src.width <= 0 || src.height <= 0 || !src.data || src.data.length === 0) {
    const emptyBlob = new Blob([], { type: 'image/png' });
    return {
      success: false,
      diffuseBlob: emptyBlob,
      blob: emptyBlob,
      fileName: 'error.png',
      fileSize: 0,
      mimeType: 'image/png',
      diffuseDataUrl: '',
      cssSnippet: '',
      error: 'Invalid or zero-dimension source image.',
    };
  }

  try {
    let workingSource = src;
    if (
      options.outputResolutionPx > 0 &&
      (src.width !== options.outputResolutionPx || src.height !== options.outputResolutionPx)
    ) {
      workingSource = resamplePixelData(
        src,
        options.outputResolutionPx,
        options.outputResolutionPx
      );
    }

    const seamlessDiffuse = makeSeamlessTexture(workingSource, options);
    const diffuseBytes = pixelDataToPngBytes(seamlessDiffuse);
    const diffuseBlob = new Blob([diffuseBytes as BlobPart], { type: 'image/png' });
    const diffuseDataUrl = bytesToBase64DataUrl(diffuseBytes, 'image/png');

    let normalMap: TextureImageData | undefined;
    let normalMapBlob: Blob | undefined;
    let normalMapDataUrl: string | undefined;

    if (options.generateNormalMap) {
      normalMap = generateNormalMap(
        seamlessDiffuse,
        options.normalMapStrength,
        options.invertNormalY
      );
      const normalBytes = pixelDataToPngBytes(normalMap);
      normalMapBlob = new Blob([normalBytes as BlobPart], { type: 'image/png' });
      normalMapDataUrl = bytesToBase64DataUrl(normalBytes, 'image/png');
    }

    const cssSnippet = generateCssBackgroundSnippet('diffuse_seamless.png');

    // Package into ZIP
    const zip = new JSZip();
    zip.file('diffuse_seamless.png', diffuseBlob);
    if (normalMapBlob) {
      zip.file('normal_map.png', normalMapBlob);
    }
    zip.file('texture.css', cssSnippet);

    const zipBlob = await zip.generateAsync({ type: 'blob' });

    return {
      success: true,
      diffuseBlob,
      normalMapBlob,
      zipBlob,
      blob: zipBlob,
      fileName: 'seamless_textures.zip',
      fileSize: zipBlob.size,
      mimeType: 'application/zip',
      diffuseDataUrl,
      normalMapDataUrl,
      cssSnippet,
      diffusePixels: seamlessDiffuse,
      normalPixels: normalMap,
      metadata: {
        width: seamlessDiffuse.width,
        height: seamlessDiffuse.height,
        blendMode: options.blendMode,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Processing error.';
    const emptyBlob = new Blob([], { type: 'image/png' });
    return {
      success: false,
      diffuseBlob: emptyBlob,
      blob: emptyBlob,
      fileName: 'error.png',
      fileSize: 0,
      mimeType: 'image/png',
      diffuseDataUrl: '',
      cssSnippet: '',
      error: message,
    };
  }
}

// Alias for convenience
export const processSeamlessTexture = processTexture;
