import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { JarBottleRackMakerComponent } from './jar-bottle-rack-maker.component';

afterEach(() => vi.unstubAllGlobals());

it('applies a bottle preset and sends measured dimensions to a cancellable worker', async () => {
  const postMessage = vi.fn();
  const terminate = vi.fn();
  vi.stubGlobal('Worker', class { postMessage = postMessage; terminate = terminate; });
  const fixture = TestBed.createComponent(JarBottleRackMakerComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  Array.from(host.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Vallejo 17 mL')!.click();
  fixture.detectChanges();
  expect(host.querySelector('.c-input__slider')).toBeTruthy();
  expect(host.querySelector<HTMLInputElement>('#mesh-bottleDiameterMm')?.value).toBe('25.2');
  await new Promise((resolve) => setTimeout(resolve, 170));
  expect(postMessage).toHaveBeenLastCalledWith(expect.objectContaining({
    type: 'preview',
    options: expect.objectContaining({ preset: 'vallejo_17ml', mode: 'honeycomb_tray', bottleDiameterMm: 25.2 }),
  }));
  fixture.destroy();
  expect(terminate).toHaveBeenCalledOnce();
});
