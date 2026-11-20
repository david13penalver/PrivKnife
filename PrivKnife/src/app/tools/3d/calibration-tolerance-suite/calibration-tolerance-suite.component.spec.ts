import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { CalibrationToleranceSuiteComponent } from './calibration-tolerance-suite.component';

afterEach(() => vi.unstubAllGlobals());

it('updates the first-layer layout and nozzle from presets and disposes its worker', async () => {
  const postMessage = vi.fn();
  const terminate = vi.fn();
  vi.stubGlobal('Worker', class { postMessage = postMessage; terminate = terminate; });
  const fixture = TestBed.createComponent(CalibrationToleranceSuiteComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const buttons = Array.from(host.querySelectorAll('button'));
  buttons.find((button) => button.textContent?.trim() === '0.6 mm')!.click();
  buttons.find((button) => button.textContent?.trim() === '256 × 256 mm')!.click();
  fixture.detectChanges();
  expect(host.querySelector<HTMLInputElement>('#mesh-bedWidthMm')?.value).toBe('256');
  expect(host.querySelector('.c-input__slider')).toBeTruthy();
  await new Promise((resolve) => setTimeout(resolve, 170));
  expect(postMessage).toHaveBeenLastCalledWith(expect.objectContaining({
    type: 'preview',
    options: expect.objectContaining({ mode: 'first_layer_sheet', nozzleDiameterMm: 0.6, bedWidthMm: 256, bedDepthMm: 256 }),
  }));
  fixture.destroy();
  expect(terminate).toHaveBeenCalledOnce();
});
