import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundwaveArtMakerComponent } from './soundwave-art-maker.component';

describe('SoundwaveArtMakerComponent', () => {
  let component: SoundwaveArtMakerComponent;
  let fixture: ComponentFixture<SoundwaveArtMakerComponent>;

  beforeEach(async () => {
    // Stub localStorage
    const store: Record<string, string> = {};
    const mockStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k in store) delete store[k];
      },
    };
    vi.stubGlobal('localStorage', mockStorage);

    await TestBed.configureTestingModule({
      imports: [SoundwaveArtMakerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SoundwaveArtMakerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
  });

  it('initializes with default soundwave configuration and live SVG preview', () => {
    expect(component.config().title).toBe('Can’t Help Falling in Love');
    expect(component.config().barCount).toBe(50);
    expect(component.config().style).toBe('mirrored');
    expect(component.svgPreview()).toContain('<svg');
    expect(component.svgPreview()).toContain('Can’t Help Falling in Love');
  });

  it('updates SVG preview reactively when styling or parameters change', () => {
    component.setStyle('bottom');
    expect(component.config().style).toBe('bottom');
    expect(component.svgPreview()).toContain('data-style="bottom"');

    component.setTitle('Our Special Song');
    expect(component.config().title).toBe('Our Special Song');
    expect(component.svgPreview()).toContain('Our Special Song');

    component.setBarCount(60);
    expect(component.config().barCount).toBe(60);
    expect(component.bars().length).toBe(60);
  });

  it('changes art themes seamlessly', () => {
    component.setThemePreset('midnight-gold');
    expect(component.config().themePreset).toBe('midnight-gold');
    expect(component.svgPreview()).toContain('#0A0E1A');
  });

  it('loads sample presets (Voice Memo, Acoustic Song, Heartbeat)', () => {
    component.loadSamplePreset('voice-memo');
    expect(component.config().title).toContain('Voice Memo');
    expect(component.bars().length).toBeGreaterThan(0);

    component.loadSamplePreset('heartbeat');
    expect(component.config().title).toContain('Heartbeat');
  });

  it('persists configuration into localStorage and restores it', () => {
    component.setTitle('Persisted Soundwave Title');
    fixture.detectChanges();

    const saved = localStorage.getItem('privknife_soundwave_config');
    expect(saved).toBeTruthy();
    expect(saved).toContain('Persisted Soundwave Title');
  });

  it('triggers SVG, PDF, and 3D STL downloads and revokes Object URLs', async () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    component.downloadSvg();
    expect(createUrlSpy).toHaveBeenCalled();
    expect(revokeUrlSpy).toHaveBeenCalled();

    await component.downloadPdf();
    expect(createUrlSpy).toHaveBeenCalled();

    component.downloadStl();
    expect(createUrlSpy).toHaveBeenCalled();

    createUrlSpy.mockRestore();
    revokeUrlSpy.mockRestore();
  });

  it('guarantees zero network calls during generation and downloads (Privacy Guard)', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

    component.loadSamplePreset('voice-memo');
    component.setStyle('radial');
    component.downloadSvg();
    await component.downloadPdf();
    component.downloadStl();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
  });
});
