import {
  CANVAS_SIZES,
  CHASSIS_PALETTES,
  DEVICE_SPECS,
  GRADIENT_PALETTES,
} from './test-fixtures';
import {
  AffineTransform,
  AnglePreset,
  BackgroundStyle,
  CanvasDimensions,
  CanvasSizePreset,
  DeviceDimensions,
  DeviceType,
  GradientPreset,
  ImageFitMode,
  MockupConfig,
  ScreenBounds,
} from './types';

/**
 * Returns canvas pixel dimensions for a given size preset and export multiplier.
 */
export function getCanvasDimensions(
  preset: CanvasSizePreset,
  scaleMultiplier: number = 1
): CanvasDimensions {
  const base = CANVAS_SIZES[preset] || CANVAS_SIZES['twitter-landscape'];
  const multiplier = Math.max(1, scaleMultiplier);
  return {
    width: Math.round(base.width * multiplier),
    height: Math.round(base.height * multiplier),
    aspectRatio: base.aspectRatio,
  };
}

/**
 * Returns authentic hardware dimensions & bezels for a given device type.
 */
export function getDeviceDimensions(deviceType: DeviceType): DeviceDimensions {
  return DEVICE_SPECS[deviceType] || DEVICE_SPECS.phone;
}

/**
 * Calculates screen area within device bezel where screenshot is rendered.
 */
export function calculateDeviceScreenBounds(deviceType: DeviceType): ScreenBounds {
  const specs = getDeviceDimensions(deviceType);

  if (deviceType === 'browser') {
    const titleBarHeight = 38;
    return {
      x: specs.bezelWidth,
      y: titleBarHeight,
      width: specs.width - 2 * specs.bezelWidth,
      height: specs.height - titleBarHeight - specs.bezelWidth,
      cornerRadius: Math.max(0, specs.cornerRadius - 4),
    };
  }

  if (deviceType === 'laptop') {
    const bottomChinHeight = 24;
    return {
      x: specs.bezelWidth,
      y: specs.bezelWidth,
      width: specs.width - 2 * specs.bezelWidth,
      height: specs.height - specs.bezelWidth - bottomChinHeight,
      cornerRadius: Math.max(0, specs.cornerRadius - specs.bezelWidth),
    };
  }

  return {
    x: specs.bezelWidth,
    y: specs.bezelWidth,
    width: specs.width - 2 * specs.bezelWidth,
    height: specs.height - 2 * specs.bezelWidth,
    cornerRadius: Math.max(0, specs.cornerRadius - specs.bezelWidth),
  };
}

/**
 * Computes 2.5D affine transform parameters for perspective angles.
 */
export function calculatePerspectiveTransform(
  preset: AnglePreset,
  scaleFactor: number = 1
): AffineTransform {
  switch (preset) {
    case 'isometric-left':
      return {
        scaleX: scaleFactor * 0.94,
        scaleY: scaleFactor * 0.94,
        skewX: -0.16,
        skewY: 0.14,
        rotationRad: -0.05,
        translateX: 20,
        translateY: -10,
      };
    case 'isometric-right':
      return {
        scaleX: scaleFactor * 0.94,
        scaleY: scaleFactor * 0.94,
        skewX: 0.16,
        skewY: -0.14,
        rotationRad: 0.05,
        translateX: -20,
        translateY: -10,
      };
    case 'tilt-dynamic':
      return {
        scaleX: scaleFactor * 0.92,
        scaleY: scaleFactor * 0.92,
        skewX: 0.14,
        skewY: 0.06,
        rotationRad: 0.12, // ~7 degrees
        translateX: -15,
        translateY: 0,
      };
    case 'float':
      return {
        scaleX: scaleFactor * 0.96,
        scaleY: scaleFactor * 0.96,
        skewX: 0,
        skewY: 0,
        rotationRad: 0,
        translateX: 0,
        translateY: -35, // Raised up
      };
    case 'front':
    default:
      return {
        scaleX: scaleFactor,
        scaleY: scaleFactor,
        skewX: 0,
        skewY: 0,
        rotationRad: 0,
        translateX: 0,
        translateY: 0,
      };
  }
}

export interface ImageCropRect {
  sx: number;
  sy: number;
  sWidth: number;
  sHeight: number;
  dx: number;
  dy: number;
  dWidth: number;
  dHeight: number;
}

/**
 * Calculates image placement rectangle to fit inside device screen bounds.
 */
export function calculateImageFit(
  imageWidth: number,
  imageHeight: number,
  targetWidth: number,
  targetHeight: number,
  mode: ImageFitMode
): ImageCropRect {
  if (mode === 'stretch') {
    return {
      sx: 0,
      sy: 0,
      sWidth: imageWidth,
      sHeight: imageHeight,
      dx: 0,
      dy: 0,
      dWidth: targetWidth,
      dHeight: targetHeight,
    };
  }

  const imgAspect = imageWidth / imageHeight;
  const targetAspect = targetWidth / targetHeight;

  if (mode === 'contain') {
    let dWidth = targetWidth;
    let dHeight = targetHeight;
    let dx = 0;
    let dy = 0;

    if (imgAspect > targetAspect) {
      dHeight = targetWidth / imgAspect;
      dy = (targetHeight - dHeight) / 2;
    } else {
      dWidth = targetHeight * imgAspect;
      dx = (targetWidth - dWidth) / 2;
    }

    return {
      sx: 0,
      sy: 0,
      sWidth: imageWidth,
      sHeight: imageHeight,
      dx,
      dy,
      dWidth,
      dHeight,
    };
  }

  // Cover mode (default)
  let sWidth = imageWidth;
  let sHeight = imageHeight;
  let sx = 0;
  let sy = 0;

  if (imgAspect > targetAspect) {
    // Image is wider than screen: crop left and right
    sWidth = imageHeight * targetAspect;
    sx = (imageWidth - sWidth) / 2;
  } else {
    // Image is taller than screen: crop top and bottom
    sHeight = imageWidth / targetAspect;
    sy = (imageHeight - sHeight) / 2;
  }

  return {
    sx,
    sy,
    sWidth,
    sHeight,
    dx: 0,
    dy: 0,
    dWidth: targetWidth,
    dHeight: targetHeight,
  };
}

/**
 * Draws background styling (transparent, solid color, or vibrant gradient).
 */
export function renderBackgroundToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  style: BackgroundStyle,
  gradientPreset: GradientPreset,
  solidColor: string
): void {
  ctx.save();
  if (style === 'transparent') {
    ctx.clearRect(0, 0, width, height);
  } else if (style === 'solid') {
    ctx.fillStyle = solidColor || '#0f172a';
    ctx.fillRect(0, 0, width, height);
  } else {
    // Gradient
    const def = GRADIENT_PALETTES[gradientPreset] || GRADIENT_PALETTES.sunset;
    const rad = (def.angleDeg * Math.PI) / 180;
    const x1 = width / 2 - (Math.cos(rad) * width) / 2;
    const y1 = height / 2 - (Math.sin(rad) * height) / 2;
    const x2 = width / 2 + (Math.cos(rad) * width) / 2;
    const y2 = height / 2 + (Math.sin(rad) * height) / 2;

    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    for (const stop of def.stops) {
      grad.addColorStop(stop.offset, stop.color);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}

/**
 * Main pure compositing engine: draws complete device mockup with perspective, chassis, shadows, and screen texture.
 */
export function renderMockupToCanvas(
  canvas: HTMLCanvasElement,
  config: MockupConfig,
  screenshotImage?: CanvasImageSource | null,
  renderMultiplier: number = 1
): void {
  const canvasDim = getCanvasDimensions(config.canvasSizePreset, renderMultiplier);
  canvas.width = canvasDim.width;
  canvas.height = canvasDim.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Draw Background
  renderBackgroundToCanvas(
    ctx,
    canvasDim.width,
    canvasDim.height,
    config.backgroundStyle,
    config.gradientPreset,
    config.customBgColor
  );

  // 2. Compute device scaling to fit nicely in canvas viewport
  const devSpecs = getDeviceDimensions(config.deviceType);
  const targetCanvasHeight = canvasDim.height * 0.78 * config.deviceScale;
  const targetCanvasWidth = canvasDim.width * 0.78 * config.deviceScale;
  const scaleByHeight = targetCanvasHeight / devSpecs.height;
  const scaleByWidth = targetCanvasWidth / devSpecs.width;
  const baseScale = Math.min(scaleByHeight, scaleByWidth);

  const transform = calculatePerspectiveTransform(config.anglePreset, baseScale);

  ctx.save();

  // Move origin to canvas center
  const centerX = canvasDim.width / 2 + transform.translateX;
  const centerY = canvasDim.height / 2 + transform.translateY;
  ctx.translate(centerX, centerY);

  // Apply perspective affine transformation
  ctx.rotate(transform.rotationRad);
  ctx.transform(
    transform.scaleX,
    transform.skewY,
    transform.skewX,
    transform.scaleY,
    0,
    0
  );

  const devW = devSpecs.width;
  const devH = devSpecs.height;
  const halfW = devW / 2;
  const halfH = devH / 2;

  // 3. Realistic Drop Shadow
  if (config.shadowIntensity > 0) {
    ctx.save();
    const shadowAlpha = (config.shadowIntensity / 100) * 0.45;
    const blur = config.shadowBlur * (baseScale * 1.5);
    const offsetY = config.shadowOffsetY * (baseScale * 1.8);

    ctx.shadowColor = `rgba(0, 0, 0, ${shadowAlpha.toFixed(3)})`;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = offsetY;

    // Draw shadow-casting silhouette
    ctx.fillStyle = 'rgba(0,0,0,1)';
    drawRoundedRect(ctx, -halfW, -halfH, devW, devH, devSpecs.cornerRadius);
    ctx.fill();
    ctx.restore();
  }

  // 4. Device Chassis
  const palette = CHASSIS_PALETTES[config.chassisColor] || CHASSIS_PALETTES.midnight;

  // Outer chassis rim (metallic bevel)
  ctx.save();
  const rimGrad = ctx.createLinearGradient(-halfW, -halfH, halfW, halfH);
  rimGrad.addColorStop(0, palette.rim);
  rimGrad.addColorStop(0.5, palette.body);
  rimGrad.addColorStop(1, palette.rim);

  ctx.fillStyle = rimGrad;
  drawRoundedRect(ctx, -halfW, -halfH, devW, devH, devSpecs.cornerRadius);
  ctx.fill();

  // Outer bezel border stroke
  ctx.strokeStyle = palette.innerBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner chassis body
  ctx.fillStyle = palette.bezel;
  const innerInset = 2;
  drawRoundedRect(
    ctx,
    -halfW + innerInset,
    -halfH + innerInset,
    devW - 2 * innerInset,
    devH - 2 * innerInset,
    Math.max(2, devSpecs.cornerRadius - innerInset)
  );
  ctx.fill();

  // 5. Browser Title Bar (if browser device)
  if (config.deviceType === 'browser') {
    renderBrowserHeader(ctx, -halfW, -halfH, devW, palette);
  }

  // 6. Laptop Bottom Deck Hinge (if laptop)
  if (config.deviceType === 'laptop') {
    renderLaptopDeck(ctx, -halfW, halfH, devW, palette);
  }

  // 7. Screen Area & Screenshot Texture
  const screenBounds = calculateDeviceScreenBounds(config.deviceType);
  const screenX = -halfW + screenBounds.x;
  const screenY = -halfH + screenBounds.y;
  const screenW = screenBounds.width;
  const screenH = screenBounds.height;
  const screenR = screenBounds.cornerRadius;

  ctx.save();
  // Clip strictly to screen inner bounds
  drawRoundedRect(ctx, screenX, screenY, screenW, screenH, screenR);
  ctx.clip();

  // Fill black screen base
  ctx.fillStyle = '#050507';
  ctx.fillRect(screenX, screenY, screenW, screenH);

  if (screenshotImage) {
    const imgWidth = (screenshotImage as HTMLImageElement).naturalWidth || (screenshotImage as HTMLCanvasElement).width || screenW;
    const imgHeight = (screenshotImage as HTMLImageElement).naturalHeight || (screenshotImage as HTMLCanvasElement).height || screenH;
    const fit = calculateImageFit(imgWidth, imgHeight, screenW, screenH, config.imageFit);

    ctx.drawImage(
      screenshotImage,
      fit.sx,
      fit.sy,
      fit.sWidth,
      fit.sHeight,
      screenX + fit.dx,
      screenY + fit.dy,
      fit.dWidth,
      fit.dHeight
    );
  } else {
    // Elegant fallback screen placeholder
    renderDefaultScreenPlaceholder(ctx, screenX, screenY, screenW, screenH);
  }

  // 8. Dynamic Island / Top Notch Hardware Accents (on top of screen)
  if (devSpecs.hasDynamicIsland) {
    renderDynamicIsland(ctx, 0, screenY + 11);
  } else if (devSpecs.hasNotch) {
    renderMacBookNotch(ctx, 0, screenY);
  }

  // 9. Diagonal Specular Glass Reflection Sheen
  if (config.glareOpacity > 0) {
    renderScreenGlare(ctx, screenX, screenY, screenW, screenH, config.glareOpacity);
  }

  ctx.restore(); // restore clip

  ctx.restore(); // restore perspective transformation
}

/**
 * Draws rounded rectangle path compatible across standard canvas 2D contexts.
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(x, y, w, h, radius);
  } else {
    // Fallback standard arcTo path
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.arcTo(x + w, y, x + w, y + radius, radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
    ctx.lineTo(x + radius, y + h);
    ctx.arcTo(x, y + h, x, y + h - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  }
}

/**
 * Draws iPhone Dynamic Island pill cutout with camera sensor & microphone dot.
 */
function renderDynamicIsland(ctx: CanvasRenderingContext2D, centerX: number, topY: number): void {
  const pillW = 110;
  const pillH = 30;
  const pillR = 15;
  const pillX = centerX - pillW / 2;

  ctx.save();
  ctx.fillStyle = '#000000';
  drawRoundedRect(ctx, pillX, topY, pillW, pillH, pillR);
  ctx.fill();

  // Camera lens reflection
  ctx.fillStyle = '#101428';
  ctx.beginPath();
  ctx.arc(centerX + 26, topY + pillH / 2, 5.5, 0, Math.PI * 2);
  ctx.fill();

  // Tiny blue-green lens coating dot
  ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.beginPath();
  ctx.arc(centerX + 26, topY + pillH / 2, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws MacBook display notch cutout.
 */
function renderMacBookNotch(ctx: CanvasRenderingContext2D, centerX: number, topY: number): void {
  const notchW = 160;
  const notchH = 22;
  const notchX = centerX - notchW / 2;

  ctx.save();
  ctx.fillStyle = '#000000';
  drawRoundedRect(ctx, notchX, topY, notchW, notchH, 6);
  ctx.fill();

  // Webcam sensor
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.arc(centerX, topY + notchH / 2, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws browser window titlebar with traffic light buttons and address bar pill.
 */
function renderBrowserHeader(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  palette: any
): void {
  const barH = 38;

  ctx.save();
  // Header background
  ctx.fillStyle = palette.body;
  drawRoundedRect(ctx, x, y, w, barH, 12);
  ctx.fill();

  // Traffic lights
  const dots = [
    { x: x + 18, color: '#ff5f57' },
    { x: x + 34, color: '#febc2e' },
    { x: x + 50, color: '#28c840' },
  ];

  for (const d of dots) {
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.arc(d.x, y + barH / 2, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Address bar capsule
  const urlW = Math.min(360, w * 0.5);
  const urlX = x + (w - urlW) / 2;
  const urlY = y + 7;
  const urlH = 24;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  drawRoundedRect(ctx, urlX, urlY, urlW, urlH, 6);
  ctx.fill();

  // Lock icon text
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🔒 https://privknife.dev', urlX + urlW / 2, urlY + urlH / 2);

  ctx.restore();
}

/**
 * Draws bottom keyboard shelf / lip for laptop frame.
 */
function renderLaptopDeck(
  ctx: CanvasRenderingContext2D,
  x: number,
  bottomY: number,
  w: number,
  palette: any
): void {
  ctx.save();
  const deckW = w * 1.14;
  const deckX = x - (deckW - w) / 2;
  const deckH = 16;
  const deckY = bottomY - 14;

  const deckGrad = ctx.createLinearGradient(deckX, deckY, deckX, deckY + deckH);
  deckGrad.addColorStop(0, palette.rim);
  deckGrad.addColorStop(1, palette.body);

  ctx.fillStyle = deckGrad;
  drawRoundedRect(ctx, deckX, deckY, deckW, deckH, 4);
  ctx.fill();

  // Front thumb notch
  const notchW = 120;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  drawRoundedRect(ctx, -notchW / 2, deckY, notchW, 4, 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws diagonal glass reflection glare sheen across screen.
 */
function renderScreenGlare(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opacityPercent: number
): void {
  ctx.save();
  const alpha = (opacityPercent / 100) * 0.35;
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, `rgba(255, 255, 255, ${alpha.toFixed(3)})`);
  grad.addColorStop(0.35, `rgba(255, 255, 255, ${(alpha * 0.4).toFixed(3)})`);
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/**
 * Draws attractive default screen placeholder when no image is loaded.
 */
function renderDefaultScreenPlaceholder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, '#1e1b4b');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = '#6366f1';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📱 Drop App Screenshot Here', x + w / 2, y + h / 2 - 16);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('Supports PNG, JPG, WebP & SVG', x + w / 2, y + h / 2 + 18);
}
