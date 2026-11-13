import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WebVitalsComponent } from './web-vitals.component';

describe('WebVitalsComponent legacy bookmark route', () => {
  let fixture: ComponentFixture<WebVitalsComponent>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(window, 'fetch');
    await TestBed.configureTestingModule({ imports: [WebVitalsComponent] }).compileComponents();
    fixture = TestBed.createComponent(WebVitalsComponent);
    fixture.detectChanges();
  });

  it('shows the localized privacy explanation instead of fabricated metrics', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('This tool is unavailable');
    expect(text).toContain('Google PageSpeed');
    expect(text).not.toContain('98');
  });

  it('cannot make an outgoing request on route load', () => {
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
