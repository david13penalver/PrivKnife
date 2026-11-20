import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { ThreadedTubePillOrganizerComponent } from './threaded-tube-pill-organizer.component';

afterEach(() => vi.unstubAllGlobals());

it('applies a spool preset and rebuilds after switching to assembled preview', async () => {
  const postMessage = vi.fn();
  const terminate = vi.fn();
  vi.stubGlobal('Worker', class { postMessage = postMessage; terminate = terminate; });
  const fixture = TestBed.createComponent(ThreadedTubePillOrganizerComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const preset = Array.from(host.querySelectorAll('button')).find((button) => button.textContent?.includes('Bambu'));
  preset!.click();
  fixture.detectChanges();
  host.querySelector<HTMLInputElement>('#mesh-layoutFlatPlate')!.click();
  expect(host.querySelector('.c-input__slider')).toBeTruthy();
  await new Promise((resolve) => setTimeout(resolve, 170));
  expect(postMessage).toHaveBeenLastCalledWith(expect.objectContaining({
    type: 'preview',
    options: expect.objectContaining({ mode: 'desiccant_pod', spoolPreset: 'bambu', layoutFlatPlate: false }),
  }));
  fixture.destroy();
  expect(terminate).toHaveBeenCalledOnce();
});
