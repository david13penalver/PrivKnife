export interface MeshPoint {
  id: string;
  x: number; // Percentage 0 - 100
  y: number; // Percentage 0 - 100
  color: string; // Hex color
  radius: number; // Spread percentage 20 - 100
}

export interface GlassmorphismConfig {
  opacity: number; // Percentage 0 - 100
  blur: number; // Pixels 0 - 40
  borderOpacity: number; // Percentage 0 - 100
  borderWidth: number; // Pixels 0 - 4
  borderRadius: number; // Pixels 0 - 36
  reflection: boolean;
  tint: 'light' | 'dark';
}

export interface MeshGradientConfig {
  baseColor: string;
  points: MeshPoint[];
  noise: boolean;
  blurRadius: number; // Pixels 0 - 80
}

export interface GradientPreset {
  id: string;
  name: string;
  baseColor: string;
  points: MeshPoint[];
}
