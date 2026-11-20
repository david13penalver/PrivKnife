import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { FunnelScoopMakerComponent } from './funnel-scoop-maker.component';

afterEach(() => vi.unstubAllGlobals());

it('applies volume presets through the form, cancels stale previews, and terminates on destroy', async () => {
  const postMessage = vi.fn();
  const terminate = vi.fn();
  vi.stubGlobal('Worker', class { postMessage = postMessage; terminate = terminate; });
  const fixture = TestBed.createComponent(FunnelScoopMakerComponent);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelectorAll('.c-input__control').length).toBeGreaterThan(3);
  expect(fixture.nativeElement.querySelector('.c-input__slider')).toBeTruthy();
  const preset = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
    .find((button) => button.textContent?.trim() === '30 mL');
  expect(preset).toBeDefined();
  preset!.click();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 180));
  expect(postMessage).toHaveBeenLastCalledWith(expect.objectContaining({
    type: 'preview',
    options: expect.objectContaining({ mode: 'measuring_scoop', volume: 30, unit: 'ml' }),
  }));
  fixture.destroy();
  expect(terminate).toHaveBeenCalled();
});

it('pairs a completed download with URL revocation and worker termination', async () => {
  const workers: TestWorker[] = [];
  class TestWorker {
    onmessage?: (event: { data: unknown }) => void;
    postMessage = vi.fn();
    terminate = vi.fn();
    constructor() { workers.push(this); }
  }
  vi.stubGlobal('Worker', TestWorker);
  const href = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const objectUrl = vi.fn(() => 'blob:local-test');
  const revokeUrl = vi.fn();
  vi.stubGlobal('URL', class extends URL { static override createObjectURL = objectUrl; static override revokeObjectURL = revokeUrl; });
  const fixture = TestBed.createComponent(FunnelScoopMakerComponent);
  try {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 170));
    workers[0].onmessage!({ data: { type: 'preview', parts: [], metrics: { widthMm: 80 } } });
    fixture.detectChanges();
    const exportButton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((button) => button.textContent?.trim() === 'Download STL');
    exportButton!.click();
    workers[1].onmessage!({ data: { type: 'download', buffer: new ArrayBuffer(134), metrics: {} } });
    expect(objectUrl).toHaveBeenCalledOnce();
    expect(href).toHaveBeenCalledOnce();
    expect(revokeUrl).toHaveBeenCalledWith('blob:local-test');
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    expect(workers[1].terminate).toHaveBeenCalledOnce();
  } finally {
    href.mockRestore();
    fixture.destroy();
  }
});
