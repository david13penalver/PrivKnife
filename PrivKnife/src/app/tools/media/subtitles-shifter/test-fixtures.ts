import { FpsPreset, SubtitleCue } from './types';

export const SAMPLE_SRT = `1
00:00:01,000 --> 00:00:04,250
Welcome to PrivKnife!
All file processing is 100% private.

2
00:00:05,000 --> 00:00:08,750
No servers. No data tracking.

3
00:01:12,500 --> 00:01:15,000
Enjoy fast, offline subtitle syncing!`;

export const SAMPLE_VTT = `WEBVTT - PrivKnife Demo

1
00:00:01.000 --> 00:00:04.250
Welcome to PrivKnife!
All file processing is 100% private.

2
00:00:05.000 --> 00:00:08.750
No servers. No data tracking.

3
00:01:12.500 --> 00:01:15.000
Enjoy fast, offline subtitle syncing!`;

export const SAMPLE_CUES: SubtitleCue[] = [
  {
    index: 1,
    startMs: 1000,
    endMs: 4250,
    text: 'Welcome to PrivKnife!\nAll file processing is 100% private.',
  },
  {
    index: 2,
    startMs: 5000,
    endMs: 8750,
    text: 'No servers. No data tracking.',
  },
  {
    index: 3,
    startMs: 72500,
    endMs: 75000,
    text: 'Enjoy fast, offline subtitle syncing!',
  },
];

export const FPS_PRESETS: FpsPreset[] = [
  { id: '23.976-to-25', name: '23.976 fps → 25 fps (Film to PAL)', fromFps: 23.976, toFps: 25 },
  { id: '25-to-23.976', name: '25 fps → 23.976 fps (PAL to Film)', fromFps: 25, toFps: 23.976 },
  { id: '24-to-25', name: '24 fps → 25 fps', fromFps: 24, toFps: 25 },
  { id: '25-to-29.97', name: '25 fps → 29.97 fps (PAL to NTSC)', fromFps: 25, toFps: 29.97 },
  { id: '23.976-to-29.97', name: '23.976 fps → 29.97 fps', fromFps: 23.976, toFps: 29.97 },
];

export function createMockSubtitleFile(
  name = 'sample.srt',
  content = SAMPLE_SRT,
  type = 'text/plain'
): File {
  return new File([content], name, { type });
}
