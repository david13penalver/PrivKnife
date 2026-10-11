import { GlassmorphismConfig, GradientPreset, MeshGradientConfig } from './types';

export const DEFAULT_MESH_CONFIG: MeshGradientConfig = {
  baseColor: '#0f172a',
  points: [
    { id: 'p1', x: 20, y: 25, color: '#3b82f6', radius: 55 },
    { id: 'p2', x: 80, y: 20, color: '#8b5cf6', radius: 60 },
    { id: 'p3', x: 30, y: 80, color: '#ec4899', radius: 50 },
    { id: 'p4', x: 75, y: 75, color: '#06b6d4', radius: 55 },
  ],
  noise: false,
  blurRadius: 40,
};

export const DEFAULT_GLASS_CONFIG: GlassmorphismConfig = {
  opacity: 18,
  blur: 16,
  borderOpacity: 25,
  borderWidth: 1,
  borderRadius: 20,
  reflection: true,
  tint: 'light',
};

export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: 'sunset',
    name: 'Sunset Glow',
    baseColor: '#1e1b4b',
    points: [
      { id: 's1', x: 25, y: 30, color: '#f43f5e', radius: 55 },
      { id: 's2', x: 80, y: 25, color: '#fb923c', radius: 50 },
      { id: 's3', x: 50, y: 75, color: '#7c3aed', radius: 60 },
      { id: 's4', x: 85, y: 80, color: '#f59e0b', radius: 45 },
    ],
  },
  {
    id: 'aurora',
    name: 'Northern Aurora',
    baseColor: '#022c22',
    points: [
      { id: 'a1', x: 20, y: 35, color: '#10b981', radius: 60 },
      { id: 'a2', x: 75, y: 25, color: '#06b6d4', radius: 55 },
      { id: 'a3', x: 45, y: 80, color: '#3b82f6', radius: 50 },
      { id: 'a4', x: 85, y: 70, color: '#14b8a6', radius: 45 },
    ],
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    baseColor: '#180828',
    points: [
      { id: 'c1', x: 15, y: 25, color: '#d946ef', radius: 60 },
      { id: 'c2', x: 85, y: 20, color: '#06b6d4', radius: 55 },
      { id: 'c3', x: 30, y: 85, color: '#f43f5e', radius: 50 },
      { id: 'c4', x: 80, y: 80, color: '#8b5cf6', radius: 60 },
    ],
  },
  {
    id: 'cotton-candy',
    name: 'Cotton Candy',
    baseColor: '#f8fafc',
    points: [
      { id: 'cc1', x: 25, y: 30, color: '#f472b6', radius: 55 },
      { id: 'cc2', x: 75, y: 25, color: '#38bdf8', radius: 55 },
      { id: 'cc3', x: 40, y: 75, color: '#c084fc', radius: 50 },
      { id: 'cc4', x: 80, y: 80, color: '#fbcfe8', radius: 45 },
    ],
  },
  {
    id: 'dark-matter',
    name: 'Dark Matter',
    baseColor: '#030712',
    points: [
      { id: 'dm1', x: 30, y: 30, color: '#1e1b4b', radius: 65 },
      { id: 'dm2', x: 70, y: 25, color: '#312e81', radius: 60 },
      { id: 'dm3', x: 25, y: 75, color: '#1e3a8a', radius: 55 },
      { id: 'dm4', x: 80, y: 80, color: '#0369a1', radius: 50 },
    ],
  },
];
