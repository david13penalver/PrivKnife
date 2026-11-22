/// <reference types="node" />

import { readFileSync } from 'fs';
import { createWoff2Encoder } from '../src/app/tools/dev/font-subsetter-converter/woff2-codec';

export const encodeTestWoff2 = createWoff2Encoder(() =>
  Uint8Array.from(readFileSync('node_modules/woff2-encode-wasm/dist/encoder.wasm')),
);
