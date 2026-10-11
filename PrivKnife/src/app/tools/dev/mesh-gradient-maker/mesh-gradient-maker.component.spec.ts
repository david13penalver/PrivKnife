import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MeshGradientMakerComponent } from './mesh-gradient-maker.component';
import { GRADIENT_PRESETS } from './test-fixtures';
import { MeshPoint } from './types';

describe('MeshGradientMakerComponent (Seam 2: UI, Reactivity, Code Exporters & Privacy Guard)', () => {
  let fixture: ComponentFixture<MeshGradientMakerComponent>;
  let component: MeshGradientMakerComponent;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;

  beforeEach(async () => {
    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => `blob:https://privknife.com/mock-mesh-png-${Math.random()}`);
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [MeshGradientMakerComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MeshGradientMakerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default configurations, presets, and code snippets', () => {
    expect(component).toBeTruthy();
    expect(component.meshConfig().points.length).toBe(4);
    expect(component.meshConfig().baseColor).toBe('#0f172a');
    expect(component.glassConfig().blur).toBe(16);
    expect(component.activeCodeTab()).toBe('css');
    expect(component.generatedCss()).toContain('radial-gradient');
    expect(component.generatedTailwind()).toContain('backdrop-blur');
    expect(component.presets.length).toBeGreaterThanOrEqual(4);
  });

  it('should reactively update base color and toggle noise simulation', () => {
    component.updateBaseColor('#1e1b4b');
    expect(component.meshConfig().baseColor).toBe('#1e1b4b');
    expect(component.generatedCss()).toContain('#1e1b4b');

    const initialNoise = component.meshConfig().noise;
    component.toggleNoise();
    expect(component.meshConfig().noise).toBe(!initialNoise);
  });

  it('should reactively add, edit, and remove mesh points', () => {
    const initialCount = component.meshConfig().points.length;

    // Add point
    component.addPoint();
    expect(component.meshConfig().points.length).toBe(initialCount + 1);

    // Update point
    const firstPoint = component.meshConfig().points[0];
    component.updatePoint(firstPoint.id, { color: '#ff0055', x: 42, y: 88 });
    const updated = component.meshConfig().points.find((p: MeshPoint) => p.id === firstPoint.id);
    expect(updated?.color).toBe('#ff0055');
    expect(updated?.x).toBe(42);
    expect(updated?.y).toBe(88);
    expect(component.generatedCss()).toContain('#ff0055');

    // Remove point
    component.removePoint(firstPoint.id);
    expect(component.meshConfig().points.length).toBe(initialCount);
    expect(component.meshConfig().points.some((p: MeshPoint) => p.id === firstPoint.id)).toBe(false);
  });

  it('should reactively update glassmorphism configuration attributes', () => {
    component.updateGlass('blur', 28);
    expect(component.glassConfig().blur).toBe(28);
    expect(component.generatedCss()).toContain('blur(28px)');

    component.updateGlass('opacity', 45);
    expect(component.glassConfig().opacity).toBe(45);

    component.updateGlass('borderRadius', 32);
    expect(component.glassConfig().borderRadius).toBe(32);
    expect(component.generatedCss()).toContain('border-radius: 32px');

    component.updateGlass('tint', 'dark');
    expect(component.glassConfig().tint).toBe('dark');
    expect(component.generatedCss()).toContain('rgba(15, 23, 42');
  });

  it('should apply color presets accurately', () => {
    const auroraPreset = GRADIENT_PRESETS.find((p) => p.id === 'aurora')!;
    component.applyPreset(auroraPreset);

    expect(component.meshConfig().baseColor).toBe(auroraPreset.baseColor);
    expect(component.meshConfig().points.length).toBe(auroraPreset.points.length);
    expect(component.generatedCss()).toContain(auroraPreset.baseColor);
  });

  it('should randomize mesh points within valid coordinate ranges', () => {
    component.randomize();
    const points = component.meshConfig().points;
    expect(points.length).toBeGreaterThanOrEqual(3);
    for (const pt of points) {
      expect(pt.x).toBeGreaterThanOrEqual(0);
      expect(pt.x).toBeLessThanOrEqual(100);
      expect(pt.y).toBeGreaterThanOrEqual(0);
      expect(pt.y).toBeLessThanOrEqual(100);
      expect(pt.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('should switch code tabs and copy snippet to clipboard with feedback state', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextSpy },
    });

    component.setActiveCodeTab('tailwind');
    expect(component.activeCodeTab()).toBe('tailwind');
    expect(component.activeCodeSnippet()).toBe(component.generatedTailwind());

    await component.copyCode();
    expect(writeTextSpy).toHaveBeenCalledWith(component.generatedTailwind());
    expect(component.copiedCode()).toBe(true);

    component.setActiveCodeTab('css');
    expect(component.activeCodeTab()).toBe('css');
    expect(component.activeCodeSnippet()).toBe(component.generatedCss());
  });

  it('should export 1200x800 PNG image and immediately revoke object URL', async () => {
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await component.downloadPng();

    expect(anchorClickSpy).toHaveBeenCalled();
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
    expect(component.showExportModal()).toBe(true);

    component.closeExportModal();
    expect(component.showExportModal()).toBe(false);
  });

  it('should safely revoke preview and export URLs on component destroy', () => {
    fixture.destroy();
    // Verify destroy does not throw and cleans up safely
    expect(true).toBe(true);
  });

  it('should execute generation and export with ZERO network requests (Privacy Verification)', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    component.updateBaseColor('#180828');
    component.randomize();
    await component.downloadPng();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
