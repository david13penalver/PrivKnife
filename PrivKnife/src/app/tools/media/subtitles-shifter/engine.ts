import {
  ParsedSubtitleFile,
  ShiftOptions,
  SubtitleCue,
  SubtitleFormat,
} from './types';

/**
 * Parses a time string (HH:MM:SS,mmm or HH:MM:SS.mmm or MM:SS.mmm) into total milliseconds.
 */
export function parseTimestamp(timeStr: string): number {
  if (!timeStr) return 0;
  const cleaned = timeStr.trim();

  // Pattern: Optional HH:, mandatory MM:SS, comma or dot separator, mmm
  const match = cleaned.match(/^(?:(?:(\d{1,2}):)?(\d{2}):)?(\d{2})[,.](\d{3})$/);
  if (!match) {
    // Fallback split
    const parts = cleaned.replace(',', '.').split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0], 10) || 0;
      const mins = parseInt(parts[1], 10) || 0;
      const secs = parseFloat(parts[2]) || 0;
      return Math.round((hours * 3600 + mins * 60 + secs) * 1000);
    }
    if (parts.length === 2) {
      const mins = parseInt(parts[0], 10) || 0;
      const secs = parseFloat(parts[1]) || 0;
      return Math.round((mins * 60 + secs) * 1000);
    }
    return 0;
  }

  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const mins = match[2] ? parseInt(match[2], 10) : 0;
  const secs = match[3] ? parseInt(match[3], 10) : 0;
  const millis = match[4] ? parseInt(match[4], 10) : 0;

  return (hours * 3600 + mins * 60 + secs) * 1000 + millis;
}

/**
 * Formats milliseconds into standardized SRT (HH:MM:SS,mmm) or VTT (HH:MM:SS.mmm) strings.
 */
export function formatTimestamp(ms: number, format: SubtitleFormat): string {
  const safeMs = Math.max(0, Math.round(ms));

  const totalSeconds = Math.floor(safeMs / 1000);
  const millis = safeMs % 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  const ss = seconds.toString().padStart(2, '0');
  const mmm = millis.toString().padStart(3, '0');

  const separator = format === 'srt' ? ',' : '.';
  return `${hh}:${mm}:${ss}${separator}${mmm}`;
}

/**
 * Parses raw subtitle text (SRT or WebVTT) into structured cues with zero loss.
 */
export function parseSubtitles(content: string): ParsedSubtitleFile {
  const normalized = (content || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  const isVtt = normalized.startsWith('WEBVTT');
  const format: SubtitleFormat = isVtt ? 'vtt' : 'srt';

  // Split into blank-line-separated blocks
  const rawBlocks = normalized.split(/\n\s*\n/);
  const cues: SubtitleCue[] = [];
  let headerNote: string | undefined;

  let cueIndex = 1;

  for (const block of rawBlocks) {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) continue;

    // Skip top WebVTT header block
    if (trimmedBlock.startsWith('WEBVTT') || trimmedBlock.startsWith('NOTE')) {
      if (!headerNote && trimmedBlock.startsWith('WEBVTT')) {
        headerNote = trimmedBlock;
      }
      continue;
    }

    const lines = trimmedBlock.split('\n').map((l) => l.trimEnd());
    const arrowLineIndex = lines.findIndex((l) => l.includes('-->'));

    if (arrowLineIndex === -1) {
      continue; // Not a valid subtitle cue block
    }

    const arrowLine = lines[arrowLineIndex];
    const arrowParts = arrowLine.split('-->');
    if (arrowParts.length !== 2) continue;

    const startTimeRaw = arrowParts[0].trim();
    const endAndSettings = arrowParts[1].trim().split(/\s+/);
    const endTimeRaw = endAndSettings[0];
    const rawSettings =
      endAndSettings.length > 1 ? endAndSettings.slice(1).join(' ') : undefined;

    const startMs = parseTimestamp(startTimeRaw);
    const endMs = parseTimestamp(endTimeRaw);

    // Any lines before arrow line might be index or ID
    let cueId: string | undefined;
    if (arrowLineIndex > 0) {
      cueId = lines[0].trim();
    }

    // Lines after arrow line are text
    const textLines = lines.slice(arrowLineIndex + 1);
    const text = textLines.join('\n');

    cues.push({
      index: cueIndex++,
      id: cueId,
      startMs,
      endMs,
      text,
      rawSettings,
    });
  }

  return {
    format,
    cues,
    headerNote,
  };
}

/**
 * Shifts subtitle cues by a millisecond offset and optional FPS scaling factor.
 */
export function applyTimeShift(
  cues: SubtitleCue[],
  options: ShiftOptions
): SubtitleCue[] {
  const offset = options.offsetMs || 0;
  const ratio =
    options.fpsScale && options.fpsScale.toFps > 0
      ? options.fpsScale.fromFps / options.fpsScale.toFps
      : 1;

  return cues.map((cue, idx) => {
    const scaledStart = Math.round(cue.startMs * ratio) + offset;
    const scaledEnd = Math.round(cue.endMs * ratio) + offset;

    const safeStart = Math.max(0, scaledStart);
    const safeEnd = Math.max(safeStart, scaledEnd);

    return {
      ...cue,
      index: idx + 1,
      startMs: safeStart,
      endMs: safeEnd,
    };
  });
}

/**
 * Serializes subtitle cues into format-compliant SRT or WebVTT strings.
 */
export function serializeSubtitles(
  cues: SubtitleCue[],
  format: SubtitleFormat
): string {
  const blocks: string[] = [];

  if (format === 'vtt') {
    blocks.push('WEBVTT\n');
  }

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const indexNum = i + 1;
    const startTimeStr = formatTimestamp(cue.startMs, format);
    const endTimeStr = formatTimestamp(cue.endMs, format);

    const timingLine = cue.rawSettings && format === 'vtt'
      ? `${startTimeStr} --> ${endTimeStr} ${cue.rawSettings}`
      : `${startTimeStr} --> ${endTimeStr}`;

    const blockLines = [indexNum.toString(), timingLine, cue.text];
    blocks.push(blockLines.join('\n'));
  }

  return blocks.join('\n\n').trim() + '\n';
}

/**
 * Creates an in-browser Blob for the generated subtitle file.
 */
export function exportSubtitleBlob(
  content: string,
  format: SubtitleFormat
): Blob {
  const mimeType =
    format === 'vtt' ? 'text/vtt;charset=utf-8' : 'application/x-subrip;charset=utf-8';
  return new Blob([content], { type: mimeType });
}
