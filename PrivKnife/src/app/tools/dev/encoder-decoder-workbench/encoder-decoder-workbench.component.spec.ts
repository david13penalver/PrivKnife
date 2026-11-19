import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../../core/i18n';
import { EncoderDecoderWorkbenchComponent } from './encoder-decoder-workbench.component';
import {
  MORSE_SPEC_EXPECTED,
  MORSE_SPEC_INPUT,
  PNG_1X1_DATA_URI,
  URL_QUERY_SAMPLE,
  UTF8_SAMPLE_TEXT,
  XSS_HTML_SAMPLE,
} from './test-fixtures';

describe('EncoderDecoderWorkbenchComponent (Seam 3: 6-Mode UI, Binary Preview & Morse Audio Lifecycle)', () => {
  let component: EncoderDecoderWorkbenchComponent;
  let fixture: ComponentFixture<EncoderDecoderWorkbenchComponent>;
  let i18nService: I18nService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let storageSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    storageSpy = vi.spyOn(Storage.prototype, 'setItem');

    await TestBed.configureTestingModule({
      imports: [EncoderDecoderWorkbenchComponent],
      providers: [I18nService, provideRouter([])],
    }).compileComponents();

    i18nService = TestBed.inject(I18nService);
    await i18nService.setLanguage('en');

    fixture = TestBed.createComponent(EncoderDecoderWorkbenchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    storageSpy.mockRestore();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    fixture.destroy();
  });

  it('initializes with privacy badge, all 6 mode pills, default Base64 UTF-8 encode, and bidirectional swap', () => {
    expect(component).toBeTruthy();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.c-badge--privacy')).not.toBeNull();
    expect(el.querySelectorAll('[data-codec-mode]').length).toBe(6);

    expect(component.options().mode).toBe('base64');
    expect(component.inputText()).toBe(UTF8_SAMPLE_TEXT);
    const encoded = component.outputText();
    expect(encoded.length).toBeGreaterThan(0);

    component.swapInputOutput();
    fixture.detectChanges();
    expect(component.options().direction).toBe('decode');
    expect(component.inputText()).toBe(encoded);
    expect(component.outputText()).toBe(UTF8_SAMPLE_TEXT);
  });

  it('decomposes URL_QUERY_SAMPLE in URL mode and edits, adds, and deletes query parameters cleanly', () => {
    component.setMode('url');
    component.setDirection('encode');
    component.updateInput(URL_QUERY_SAMPLE);
    fixture.detectChanges();

    expect(component.urlParams()).toEqual([
      { key: 'q', value: 'hello world' },
      { key: 'tag', value: 'a' },
      { key: 'tag', value: 'b' },
    ]);

    component.updateUrlParam(0, 'value', 'privknife');
    component.removeUrlParam(1);
    component.addUrlParam('page', '2');
    fixture.detectChanges();

    expect(component.inputText()).toBe(
      'https://example.com/search?q=privknife&tag=b&page=2#results'
    );
  });

  it('sniffs PNG Data URI on Base64 decode, creates raster preview URL, downloads .png, and revokes all Object URLs on reset/ngOnDestroy', () => {
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:png-preview-1')
      .mockReturnValueOnce('blob:png-download-2')
      .mockReturnValueOnce('blob:png-preview-3');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    component.setMode('base64');
    component.setDirection('decode');
    component.updateInput(PNG_1X1_DATA_URI);
    fixture.detectChanges();

    expect(component.detectedBinary()?.mimeType).toBe('image/png');
    expect(component.detectedBinary()?.extension).toBe('png');
    expect(component.binaryPreviewUrl()).toBe('blob:png-preview-1');

    component.downloadDecodedBinary();
    expect(createSpy).toHaveBeenCalledTimes(2);

    component.reset();
    expect(component.binaryPreviewUrl()).toBeNull();
    expect(revokeSpy).toHaveBeenCalledWith('blob:png-preview-1');
    expect(revokeSpy).toHaveBeenCalledWith('blob:png-download-2');

    // Also verify ngOnDestroy revokes any active preview URL
    component.setMode('base64');
    component.setDirection('decode');
    component.updateInput(PNG_1X1_DATA_URI);
    expect(component.binaryPreviewUrl()).toBe('blob:png-preview-3');

    component.ngOnDestroy();
    expect(revokeSpy).toHaveBeenCalledWith('blob:png-preview-3');
  });

  it('decodes HTML entities strictly via text binding with zero <script> or <img> XSS DOM injection', () => {
    const encodedSafe =
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;&lt;img src=x onerror=alert(1)&gt;';

    component.setMode('html_unicode');
    component.setDirection('decode');
    component.updateInput(encodedSafe);
    fixture.detectChanges();

    const expectedPlain = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
    expect(component.outputText()).toBe(expectedPlain);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('script')).toBeNull();
    expect(el.querySelector('img')).toBeNull();

    component.setDirection('encode');
    component.updateInput(XSS_HTML_SAMPLE);
    fixture.detectChanges();
    expect(component.outputText()).toContain('&lt;script&gt;');
  });

  it('plays Morse CW audio with linearRamp envelope, closes AudioContext on stop/destroy, exports RIFF WAV, and stays offline', () => {
    const linearRampSpy = vi.fn();
    const setValueSpy = vi.fn();
    const oscStartSpy = vi.fn();
    const oscStopSpy = vi.fn();
    const closeSpy = vi.fn().mockResolvedValue(undefined);

    class MockAudioContext {
      currentTime = 0;
      destination = {};
      createOscillator = vi.fn(() => ({
        type: 'sine',
        frequency: { setValueAtTime: vi.fn(), value: 650 },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: oscStartSpy,
        stop: oscStopSpy,
      }));
      createGain = vi.fn(() => ({
        gain: {
          setValueAtTime: setValueSpy,
          linearRampToValueAtTime: linearRampSpy,
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      }));
      close = closeSpy;
    }

    vi.stubGlobal('AudioContext', MockAudioContext);
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:morse-wav');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    component.setMode('morse');
    component.setDirection('encode');
    component.updateInput(MORSE_SPEC_INPUT);
    fixture.detectChanges();
    expect(component.outputText()).toBe(MORSE_SPEC_EXPECTED);

    component.playMorseAudio();
    expect(component.isPlayingMorse()).toBe(true);
    expect(oscStartSpy).toHaveBeenCalledTimes(1);
    expect(linearRampSpy).toHaveBeenCalled();

    component.stopMorsePlayback();
    expect(component.isPlayingMorse()).toBe(false);
    expect(oscStopSpy).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalledTimes(1);

    // Download .wav
    component.downloadMorseWav();
    expect(createSpy).toHaveBeenCalledTimes(1);

    // Play again then verify ngOnDestroy closes AudioContext & revokes URL
    component.playMorseAudio();
    component.ngOnDestroy();
    expect(closeSpy).toHaveBeenCalledTimes(2);
    expect(revokeSpy).toHaveBeenCalledWith('blob:morse-wav');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });
});
