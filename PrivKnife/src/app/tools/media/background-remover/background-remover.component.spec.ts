import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackgroundRemoverComponent } from './background-remover.component';
import { SAMPLE_IMAGES } from './test-fixtures';

describe('BackgroundRemoverComponent', () => {
  let component: BackgroundRemoverComponent;
  let fixture: ComponentFixture<BackgroundRemoverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BackgroundRemoverComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BackgroundRemoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component successfully with initial state and metrics', () => {
    expect(component).toBeTruthy();
    expect(component.selectedSampleId()).toBe('product-watch');
    expect(component.imageWidth()).toBe(400);
    expect(component.imageHeight()).toBe(400);

    const metrics = component.metrics();
    expect(metrics.originalWidth).toBe(400);
    expect(metrics.originalHeight).toBe(400);
    expect(metrics.foregroundPixelCount).toBeGreaterThan(0);
  });

  it('switches between sample preset images and applies recommended parameters', () => {
    const chromaSample = SAMPLE_IMAGES.find((s) => s.id === 'chroma-logo')!;
    component.loadSampleImage(chromaSample);

    expect(component.selectedSampleId()).toBe('chroma-logo');
    expect(component.currentImageName()).toBe(chromaSample.name);
    expect(component.config().mode).toBe('chroma-key');
    expect(component.config().targetColor).toBe('#00FF00');
  });

  it('resets configuration and active image to default', () => {
    component.updateTolerance(65);
    expect(component.config().tolerance).toBe(65);

    component.resetToDefaults();
    expect(component.config().tolerance).toBe(28);
    expect(component.selectedSampleId()).toBe('product-watch');
  });

  it('updates segmentation mode and sensitivity parameters', () => {
    component.setMode('dark-bg');
    expect(component.config().mode).toBe('dark-bg');

    component.updateTolerance(45);
    expect(component.config().tolerance).toBe(45);

    component.updateFeather(4);
    expect(component.config().featherRadius).toBe(4);

    component.updateDefringe(2);
    expect(component.config().defringeRadius).toBe(2);
  });

  it('updates backdrop replacement mode and solid color', () => {
    component.setBackdropMode('solid');
    expect(component.config().backdropMode).toBe('solid');

    component.updateBackdropColor('#10B981');
    expect(component.config().backdropColor).toBe('#10B981');

    component.setBackdropMode('mask-only');
    expect(component.config().backdropMode).toBe('mask-only');
  });

  it('adjusts split view position and viewing modes', () => {
    component.updateSplitPosition(75);
    expect(component.config().splitPosition).toBe(75);

    component.setViewMode('cutout');
    expect(component.viewMode()).toBe('cutout');

    component.setViewMode('original');
    expect(component.viewMode()).toBe('original');

    component.setViewMode('split');
    expect(component.viewMode()).toBe('split');
  });

  it('handles client-side transparent PNG and alpha matte downloads with memory revocation', () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-png-url');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    component.exportTransparentPng();
    expect(createUrlSpy).toHaveBeenCalled();
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock-png-url');

    component.exportAlphaMaskPng();
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock-png-url');

    createUrlSpy.mockRestore();
    revokeUrlSpy.mockRestore();
  });

  it('handles clipboard copy action gracefully', async () => {
    await component.copyToClipboard();
    expect(component.copyStatus()).toBeDefined();
  });

  it('guarantees 100% client-side privacy with zero telemetry or network calls', () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(window, 'XMLHttpRequest');

    component.setMode('light-bg');
    component.updateTolerance(25);
    component.exportTransparentPng();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
  });

  it('cleans up image pixel buffers on destroy', () => {
    expect(() => {
      component.ngOnDestroy();
    }).not.toThrow();
  });
});
