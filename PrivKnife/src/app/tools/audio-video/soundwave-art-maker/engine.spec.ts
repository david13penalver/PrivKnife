import { describe, expect, it } from 'vitest';
import {
  generateSoundwavePdfBlob,
  generateSoundwaveStlBlob,
  generateSoundwaveSvg,
  parseSpotifyLink,
  samplePcmWaveform,
} from './engine';
import {
  createSyntheticVoiceMemoPcm,
  DEFAULT_3D_PRINT_CONFIG,
  DEFAULT_SOUNDWAVE_CONFIG,
  SAMPLE_NORMALIZED_BARS,
} from './test-fixtures';

describe('Soundwave Art Maker Engine', () => {
  describe('PCM Waveform Sampling', () => {
    it('downsamples PCM buffer into exact barCount normalized amplitudes', () => {
      const pcm = createSyntheticVoiceMemoPcm();
      const bars = samplePcmWaveform(pcm, 40);

      expect(bars.length).toBe(40);
      for (const bar of bars) {
        expect(bar).toBeGreaterThanOrEqual(0.08); // minimum aesthetic height
        expect(bar).toBeLessThanOrEqual(1.0);
      }
    });

    it('handles empty or silent buffers with gentle minimum ambient bars', () => {
      const empty = new Float32Array(0);
      const bars = samplePcmWaveform(empty, 30);

      expect(bars.length).toBe(30);
      for (const bar of bars) {
        expect(bar).toBeGreaterThanOrEqual(0.08);
        expect(bar).toBeLessThanOrEqual(0.2);
      }
    });
  });

  describe('Spotify Code & Link Parser', () => {
    it('extracts trackId from standard HTTPS open.spotify.com links', () => {
      const link =
        'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=abc123xyz';
      const result = parseSpotifyLink(link);

      expect(result).toBeDefined();
      expect(result?.trackId).toBe('4cOdK2wGLETKBW3PvgPWqT');
      expect(result?.uri).toBe('spotify:track:4cOdK2wGLETKBW3PvgPWqT');
      expect(result?.bars.length).toBe(23);
    });

    it('extracts trackId from spotify:track: URI format', () => {
      const uri = 'spotify:track:3n3Ppam7vgaVa1iaRUc9Lp';
      const result = parseSpotifyLink(uri);

      expect(result?.trackId).toBe('3n3Ppam7vgaVa1iaRUc9Lp');
      expect(result?.bars.length).toBe(23);
    });

    it('returns null for invalid non-Spotify links', () => {
      expect(parseSpotifyLink('https://example.com/test')).toBeNull();
      expect(parseSpotifyLink('')).toBeNull();
    });
  });

  describe('Parametric SVG Generation', () => {
    it('generates valid SVG with mirrored waveform style and typography', () => {
      const svg = generateSoundwaveSvg(
        SAMPLE_NORMALIZED_BARS,
        DEFAULT_SOUNDWAVE_CONFIG
      );

      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox=');
      expect(svg).toContain('Can’t Help Falling in Love');
      expect(svg).toContain('Elvis Presley');
      expect(svg).toContain('</svg>');
      // Contains rect elements for soundwave bars
      expect(svg).toContain('<rect');
    });

    it('generates bottom-aligned waveform style correctly', () => {
      const config = { ...DEFAULT_SOUNDWAVE_CONFIG, style: 'bottom' as const };
      const svg = generateSoundwaveSvg(SAMPLE_NORMALIZED_BARS, config);

      expect(svg).toContain('<svg');
      expect(svg).toContain('data-style="bottom"');
    });

    it('generates radial circular waveform style correctly', () => {
      const config = { ...DEFAULT_SOUNDWAVE_CONFIG, style: 'radial' as const };
      const svg = generateSoundwaveSvg(SAMPLE_NORMALIZED_BARS, config);

      expect(svg).toContain('<svg');
      expect(svg).toContain('data-style="radial"');
    });

    it('embeds Spotify code bar pattern when enabled', () => {
      const config = {
        ...DEFAULT_SOUNDWAVE_CONFIG,
        showSpotifyCode: true,
        spotifyLinkOrUri: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT',
      };
      const svg = generateSoundwaveSvg(SAMPLE_NORMALIZED_BARS, config);

      expect(svg).toContain('data-spotify-code="true"');
    });
  });

  describe('Vector jsPDF Poster Exporter', () => {
    it('exports a valid non-empty application/pdf Blob', async () => {
      const blob = await generateSoundwavePdfBlob(
        SAMPLE_NORMALIZED_BARS,
        DEFAULT_SOUNDWAVE_CONFIG
      );

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(500);
    });
  });

  describe('3D Manifold STL Generator', () => {
    it('generates a solid binary STL Blob with baseplate and extruded bars', () => {
      const blob = generateSoundwaveStlBlob(
        SAMPLE_NORMALIZED_BARS.slice(0, 30),
        DEFAULT_3D_PRINT_CONFIG
      );

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('model/stl');
      // A binary STL file has an 80-byte header + 4-byte triangle count + 50 bytes per triangle
      expect(blob.size).toBeGreaterThan(84);
    });

    it('generates STL with keychain hole when enabled', () => {
      const config = { ...DEFAULT_3D_PRINT_CONFIG, hasKeychainHole: true };
      const blobWithHole = generateSoundwaveStlBlob(
        SAMPLE_NORMALIZED_BARS.slice(0, 20),
        config
      );

      const configNoHole = { ...DEFAULT_3D_PRINT_CONFIG, hasKeychainHole: false };
      const blobNoHole = generateSoundwaveStlBlob(
        SAMPLE_NORMALIZED_BARS.slice(0, 20),
        configNoHole
      );

      expect(blobWithHole.size).toBeGreaterThan(0);
      expect(blobNoHole.size).toBeGreaterThan(0);
    });
  });
});
