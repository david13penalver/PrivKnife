import type { WasmSource } from 'woff2-encode-wasm';

export function createWoff2Encoder(loadCodec: () => WasmSource) {
  return async (font: ArrayBuffer): Promise<Uint8Array> => {
    const { encode, init } = await import('woff2-encode-wasm');
    await init(loadCodec());
    return encode(new Uint8Array(font));
  };
}
