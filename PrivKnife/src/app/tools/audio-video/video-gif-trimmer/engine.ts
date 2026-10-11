import { ResolutionPreset } from './types';

/**
 * Calculates scaled video dimensions preserving aspect ratio, clamped to even numbers.
 */
export function scaleDimensions(
  origW: number,
  origH: number,
  preset: ResolutionPreset
): { width: number; height: number } {
  if (origW <= 0 || origH <= 0) {
    return { width: 480, height: 360 };
  }

  function makeEven(n: number): number {
    const rounded = Math.round(n);
    return rounded % 2 === 0 ? rounded : rounded + 1;
  }

  if (preset === 'original') {
    return { width: makeEven(origW), height: makeEven(origH) };
  }

  const isLandscape = origW >= origH;

  let targetDim = 480;
  switch (preset) {
    case '720p':
      targetDim = 720;
      break;
    case '480p':
      targetDim = 480;
      break;
    case '360p':
      targetDim = 360;
      break;
    case '240p':
      targetDim = 240;
      break;
  }

  if (isLandscape) {
    // Height is constrained to targetDim (unless original height is smaller)
    const newH = Math.min(origH, targetDim);
    const newW = makeEven((origW * newH) / origH);
    return { width: newW, height: makeEven(newH) };
  } else {
    // Vertical video: Height constrained to targetDim
    const newH = Math.min(origH, targetDim);
    const newW = makeEven((origW * newH) / origH);
    return { width: newW, height: makeEven(newH) };
  }
}

/**
 * Validates, clamps, and calculates duration for timeline trim start and end points.
 */
export function calculateTrimBounds(
  durationSeconds: number,
  startTimeSec: number,
  endTimeSec: number
): { validStart: number; validEnd: number; duration: number } {
  const maxDur = Math.max(0.1, durationSeconds);
  let start = Math.max(0, Math.min(maxDur, startTimeSec));
  let end = Math.max(0, Math.min(maxDur, endTimeSec));

  if (start > end) {
    const temp = start;
    start = end;
    end = temp;
  }

  // Ensure minimal 0.1s duration
  if (end - start < 0.1) {
    end = Math.min(maxDur, start + 0.1);
  }

  const roundStart = Math.round(start * 10) / 10;
  const roundEnd = Math.round(end * 10) / 10;
  const clipDuration = Math.round((roundEnd - roundStart) * 10) / 10;

  return {
    validStart: roundStart,
    validEnd: roundEnd,
    duration: clipDuration,
  };
}

/**
 * Formats seconds into MM:SS.ms or HH:MM:SS.ms.
 */
export function formatVideoTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00.0';

  const totalSecs = Math.floor(seconds);
  const tenths = Math.round((seconds - Math.floor(seconds)) * 10) % 10;

  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const mm = minutes.toString().padStart(2, '0');
  const ss = secs.toString().padStart(2, '0');

  if (hours > 0) {
    const hh = hours.toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}.${tenths}`;
  }

  return `${mm}:${ss}.${tenths}`;
}
