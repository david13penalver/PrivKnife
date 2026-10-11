export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HslColor {
  h: number;
  s: number;
  l: number;
}

export interface ExtractedColor {
  id: string;
  hex: string;
  rgb: RgbColor;
  hsl: HslColor;
  luminance: number;
  name?: string;
}

export interface WcagCompliance {
  ratio: number;
  passAaNormal: boolean; // >= 4.5:1
  passAaLarge: boolean; // >= 3.0:1
  passAaaNormal: boolean; // >= 7.0:1
  passAaaLarge: boolean; // >= 4.5:1
  passUi: boolean; // >= 3.0:1
}

export interface ContrastMatrixCell {
  foreground: ExtractedColor;
  background: ExtractedColor;
  compliance: WcagCompliance;
}

export interface PaletteExtractionOptions {
  colorCount: number;
}
