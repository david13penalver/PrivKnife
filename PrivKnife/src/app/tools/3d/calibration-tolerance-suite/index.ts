import type { ToolDefinition } from '../../../core/models/tool.model';

export const calibrationToleranceSuiteTool: ToolDefinition = {
  id: 'calibration-tolerance-suite',
  name: "3D Printer Calibration & Fit Suite",
  category: '3d',
  description: "Generate clearance gauges, bolt and nut fit blocks, bridges, overhangs, and first-layer sheets.",
  keywords: ["calibration", "clearance", "fastener", "STL", "3MF"],
  icon: '📐',
  isFullyClientSide: true,
  loadComponent: () => import('./calibration-tolerance-suite.component').then((m) => m.CalibrationToleranceSuiteComponent),
};
