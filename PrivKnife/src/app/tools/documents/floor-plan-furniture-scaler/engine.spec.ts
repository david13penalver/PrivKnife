import { describe, it, expect } from 'vitest';
import {
  snapToGrid,
  calculateWallLength,
  calculateWallAngle,
  calculatePolygonArea,
  checkFurnitureClearances,
  formatDimension,
  generateFloorPlanSvg,
  generateBlueprintPdf,
  exportProjectToJson,
  importProjectFromJson,
  createPresetProject,
} from './engine';
import { SAMPLE_STUDIO_PLAN, DEFAULT_FLOOR_PLAN_OPTIONS } from './test-fixtures';
import { FurnitureItem, Wall } from './types';

describe('FloorPlanFurnitureScaler Engine', () => {
  it('should snap coordinates to grid step accurately', () => {
    expect(snapToGrid(23, 25)).toBe(25);
    expect(snapToGrid(12, 25)).toBe(0);
    expect(snapToGrid(104, 10)).toBe(100);
    expect(snapToGrid(106, 10)).toBe(110);
    expect(snapToGrid(150, 0)).toBe(150);
  });

  it('should calculate wall length in centimeters', () => {
    const wall: Wall = {
      id: 'w1',
      start: { x: 0, y: 0 },
      end: { x: 300, y: 400 },
      thicknessCm: 15,
    };
    expect(calculateWallLength(wall)).toBeCloseTo(500, 1);
  });

  it('should calculate wall angle in degrees', () => {
    const horizontalWall: Wall = {
      id: 'w1',
      start: { x: 0, y: 0 },
      end: { x: 400, y: 0 },
      thicknessCm: 15,
    };
    const verticalWall: Wall = {
      id: 'w2',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 300 },
      thicknessCm: 15,
    };
    expect(calculateWallAngle(horizontalWall)).toBeCloseTo(0, 1);
    expect(calculateWallAngle(verticalWall)).toBeCloseTo(90, 1);
  });

  it('should compute room polygon area in square meters and square feet', () => {
    // 600cm x 500cm = 6m x 5m = 30 m²
    const points = [
      { x: 0, y: 0 },
      { x: 600, y: 0 },
      { x: 600, y: 500 },
      { x: 0, y: 500 },
    ];
    const { areaSqM, areaSqFt } = calculatePolygonArea(points);
    expect(areaSqM).toBeCloseTo(30.0, 1);
    expect(areaSqFt).toBeCloseTo(322.9, 0);
  });

  it('should format dimensions in metric and imperial correctly', () => {
    expect(formatDimension(350, 'metric_meters')).toBe('3.50 m');
    expect(formatDimension(50, 'metric_meters')).toBe('0.50 m');
    // 304.8 cm is 10 ft
    expect(formatDimension(304.8, 'imperial_feet')).toContain(`10'`);
  });

  it('should detect clearance overlaps between furniture items', () => {
    const items: FurnitureItem[] = [
      {
        id: 'f1',
        type: 'bed_double',
        name: 'Bed',
        x: 100,
        y: 100,
        widthCm: 160,
        depthCm: 200,
        rotationDeg: 0,
      },
      {
        id: 'f2',
        type: 'desk_office',
        name: 'Desk overlapping bed',
        x: 200,
        y: 150,
        widthCm: 140,
        depthCm: 70,
        rotationDeg: 0,
      },
      {
        id: 'f3',
        type: 'sofa_2seat',
        name: 'Distant Sofa',
        x: 800,
        y: 800,
        widthCm: 160,
        depthCm: 85,
        rotationDeg: 0,
      },
    ];

    const warnings = checkFurnitureClearances(items, []);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].type).toBe('overlap');
    expect(warnings[0].itemId1).toBe('f1');
    expect(warnings[0].itemId2).toBe('f2');
  });

  it('should generate valid architectural SVG blueprint', () => {
    const svg = generateFloorPlanSvg(SAMPLE_STUDIO_PLAN);
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox=');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('Studio Apartment 30m²');
    expect(svg).toContain('Queen Bed');
    expect(svg).toContain('Study Desk');
    expect(svg).toContain('id="walls"');
    expect(svg).toContain('id="furniture"');
  });

  it('should render SVG in different theme color palettes', () => {
    const darkProject = {
      ...SAMPLE_STUDIO_PLAN,
      options: { ...SAMPLE_STUDIO_PLAN.options, themeColor: 'classic_cad_dark' as const },
    };
    const whiteProject = {
      ...SAMPLE_STUDIO_PLAN,
      options: { ...SAMPLE_STUDIO_PLAN.options, themeColor: 'clean_white' as const },
    };

    const darkSvg = generateFloorPlanSvg(darkProject);
    const whiteSvg = generateFloorPlanSvg(whiteProject);

    expect(darkSvg).toContain('#111827'); // dark background
    expect(whiteSvg).toContain('#ffffff'); // white background
  });

  it('should generate architectural blueprint PDF blob with title block', async () => {
    const blob = await generateBlueprintPdf(SAMPLE_STUDIO_PLAN);
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(500);
    expect(blob.type).toBe('application/pdf');
  });

  it('should serialize project to JSON and re-import correctly', () => {
    const jsonStr = exportProjectToJson(SAMPLE_STUDIO_PLAN);
    expect(jsonStr).toContain('Studio Apartment 30m²');
    expect(jsonStr).toContain('"version": "1.0"');

    const imported = importProjectFromJson(jsonStr);
    expect(imported.name).toBe(SAMPLE_STUDIO_PLAN.name);
    expect(imported.walls.length).toBe(SAMPLE_STUDIO_PLAN.walls.length);
    expect(imported.furniture.length).toBe(SAMPLE_STUDIO_PLAN.furniture.length);
    expect(imported.options.blueprintScale).toBe('1:50');
  });

  it('should reject invalid or corrupt JSON imports gracefully', () => {
    expect(() => importProjectFromJson('not a json')).toThrow();
    expect(() => importProjectFromJson('{"foo": "bar"}')).toThrow();
  });

  it('should create preset layouts accurately', () => {
    const studio = createPresetProject('studio_30m');
    const oneBed = createPresetProject('one_bedroom_50m');
    const office = createPresetProject('office_60m');

    expect(studio.walls.length).toBeGreaterThanOrEqual(4);
    expect(studio.furniture.length).toBeGreaterThanOrEqual(2);

    expect(oneBed.walls.length).toBeGreaterThan(studio.walls.length);
    expect(office.furniture.some((f) => f.name.includes('Desk'))).toBe(true);
  });
});
