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
  escapeXml,
  resizeRoomDimensions,
} from './engine';
import { SAMPLE_STUDIO_PLAN, DEFAULT_FLOOR_PLAN_OPTIONS } from './test-fixtures';
import { FurnitureItem, Wall, FloorPlanProject } from './types';

describe('FloorPlanFurnitureScaler Engine', () => {
  describe('snapToGrid', () => {
    it('should snap coordinates to grid step accurately', () => {
      expect(snapToGrid(23, 25)).toBe(25);
      expect(snapToGrid(12, 25)).toBe(0);
      expect(snapToGrid(104, 10)).toBe(100);
      expect(snapToGrid(106, 10)).toBe(110);
      expect(snapToGrid(150, 0)).toBe(150);
    });
  });

  describe('escapeXml & XSS Prevention (DEFECT-58-01)', () => {
    it('should escape XML entities correctly', () => {
      expect(escapeXml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
      expect(escapeXml("Tom & Jerry's")).toBe('Tom &amp; Jerry&apos;s');
      expect(escapeXml('')).toBe('');
    });

    it('should escape malicious text in project name, room name, furniture name, and designer', () => {
      const maliciousProject: FloorPlanProject = {
        ...SAMPLE_STUDIO_PLAN,
        name: 'Evil</text><img src=x onerror="alert(1)"><text>',
        options: {
          ...SAMPLE_STUDIO_PLAN.options,
          designerName: 'Hacker<script>evil()</script>',
        },
        rooms: [
          {
            id: 'r1',
            name: 'Room<img src=x onerror=1>',
            points: [
              { x: 0, y: 0 },
              { x: 600, y: 0 },
              { x: 600, y: 500 },
              { x: 0, y: 500 },
            ],
          },
        ],
        furniture: [
          {
            id: 'f1',
            type: 'custom',
            name: 'Bed<svg onload=1>',
            x: 100,
            y: 100,
            widthCm: 100,
            depthCm: 100,
            rotationDeg: 0,
          },
        ],
      };

      const svg = generateFloorPlanSvg(maliciousProject);
      expect(svg).not.toContain('<img src=x');
      expect(svg).not.toContain('<script>');
      expect(svg).not.toContain('<svg onload=1>');
      expect(svg).toContain('&lt;img src=x');
      expect(svg).toContain('&lt;script&gt;');
    });
  });

  describe('calculateWallLength & calculateWallAngle', () => {
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
  });

  describe('calculatePolygonArea & formatDimension', () => {
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
      expect(formatDimension(304.8, 'imperial_feet')).toContain(`10'`);
    });
  });

  describe('checkFurnitureClearances (DEFECT-58-03)', () => {
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
      ];

      const warnings = checkFurnitureClearances(items, []);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].type).toBe('overlap');
      expect(warnings[0].itemId1).toBe('f1');
      expect(warnings[0].itemId2).toBe('f2');
    });

    it('should detect when furniture extends beyond room wall boundaries', () => {
      const walls: Wall[] = [
        { id: 'w1', start: { x: 0, y: 0 }, end: { x: 500, y: 0 }, thicknessCm: 20 },
        { id: 'w2', start: { x: 500, y: 0 }, end: { x: 500, y: 400 }, thicknessCm: 20 },
        { id: 'w3', start: { x: 500, y: 400 }, end: { x: 0, y: 400 }, thicknessCm: 20 },
        { id: 'w4', start: { x: 0, y: 400 }, end: { x: 0, y: 0 }, thicknessCm: 20 },
      ];

      const items: FurnitureItem[] = [
        {
          id: 'f_out',
          type: 'sofa_2seat',
          name: 'Outside Sofa',
          x: -50,
          y: 200,
          widthCm: 160,
          depthCm: 85,
          rotationDeg: 0,
        },
      ];

      const warnings = checkFurnitureClearances(items, walls);
      expect(warnings.length).toBe(1);
      expect(warnings[0].itemId1).toBe('f_out');
      expect(warnings[0].itemId2).toBe('wall-boundary');
      expect(warnings[0].type).toBe('overlap');
    });
  });

  describe('resizeRoomDimensions (DEFECT-58-03)', () => {
    it('should resize walls and room points to specified dimensions', () => {
      const resized = resizeRoomDimensions(SAMPLE_STUDIO_PLAN, 800, 600);

      const w1 = resized.walls.find((w) => w.id === 'w1');
      const w2 = resized.walls.find((w) => w.id === 'w2');
      const w3 = resized.walls.find((w) => w.id === 'w3');

      expect(w1?.end.x).toBe(800);
      expect(w2?.start.x).toBe(800);
      expect(w2?.end.y).toBe(600);
      expect(w3?.start.x).toBe(800);
      expect(w3?.start.y).toBe(600);

      const room = resized.rooms[0];
      expect(room.points[1].x).toBe(800);
      expect(room.points[2].x).toBe(800);
      expect(room.points[2].y).toBe(600);
      expect(room.points[3].y).toBe(600);
    });
  });

  describe('generateFloorPlanSvg & generateBlueprintPdf', () => {
    it('should generate valid architectural SVG blueprint with responsive scaling (DEFECT-58-02)', () => {
      const svg = generateFloorPlanSvg(SAMPLE_STUDIO_PLAN);
      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox=');
      expect(svg).toContain('width="100%"');
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

    it('should generate architectural blueprint PDF blob with title block and rotated furniture (DEFECT-58-03)', async () => {
      const rotatedPlan: FloorPlanProject = {
        ...SAMPLE_STUDIO_PLAN,
        furniture: [
          {
            id: 'f_rot',
            type: 'bed_king',
            name: 'Rotated King Bed',
            x: 200,
            y: 200,
            widthCm: 180,
            depthCm: 200,
            rotationDeg: 90,
          },
        ],
      };
      const blob = await generateBlueprintPdf(rotatedPlan);
      expect(blob).toBeDefined();
      expect(blob.size).toBeGreaterThan(500);
      expect(blob.type).toBe('application/pdf');
    });
  });

  describe('import/export and presets', () => {
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

    it('should throw on invalid project JSON', () => {
      expect(() => importProjectFromJson('{"invalid": true}')).toThrow();
    });

    it('should load preset projects correctly', () => {
      const studio = createPresetProject('studio_30m');
      const oneBed = createPresetProject('one_bedroom_50m');
      const office = createPresetProject('office_60m');

      expect(studio.name).toContain('Studio');
      expect(oneBed.name).toContain('1-Bedroom');
      expect(office.name).toContain('Office');
    });
  });
});
